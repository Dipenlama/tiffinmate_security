import { CreateUserDto, LoginUserDto } from "../dtos/user.dto";
import { UserRepository } from "../repositories/auth.repository";
import { RefreshTokenRepository } from "../repositories/refresh-token.repository";
import bcryptjs from "bcryptjs";
import { HttpError } from "../errors/http-error";
import { ACCESS_TOKEN_SECRET } from "../config";
import { sha256Hex, randomToken } from "../utils/hash";
import { generateMfaSecret, buildMfaQrCode, verifyMfaCode, encryptMfaSecret, decryptMfaSecret } from "./mfa.service";
import { logAuditEvent } from "./audit-log.service";
import jwt from "jsonwebtoken";
import { IUser } from "../models/user.model";

let userRepository=new UserRepository();
let refreshTokenRepository = new RefreshTokenRepository();

// Password-reset tokens are single-use secrets, so treat them like passwords:
// only ever store a hash. If the database is ever leaked/dumped, the attacker
// gets unusable hashes instead of a set of live account-takeover tokens
// (OWASP ASVS V2.5.1, A02:2021 Cryptographic Failures).
const hashResetToken = sha256Hex;

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MFA_PREAUTH_TOKEN_TTL = '2m';
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function signAccessToken(user: Pick<IUser, '_id' | 'email' | 'username' | 'role'>): string {
    const payload = { id: user._id, email: user.email, username: user.username, role: user.role };
    return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

// A short-lived, single-purpose token proving "this client already supplied
// the correct password for this user" without yet granting a real session.
// It deliberately omits the `id` claim authorizedMiddelWare looks for, and
// carries a distinct `purpose`, so it can never be mistaken for (or replayed
// as) a real access token even though it is signed with the same secret.
function signMfaPreAuthToken(userId: string): string {
    return jwt.sign({ sub: userId, purpose: 'mfa-preauth' }, ACCESS_TOKEN_SECRET, { expiresIn: MFA_PREAUTH_TOKEN_TTL });
}

function verifyMfaPreAuthToken(mfaToken: string): string {
    let decoded: any;
    try {
        decoded = jwt.verify(mfaToken, ACCESS_TOKEN_SECRET);
    } catch {
        throw new HttpError(401, 'MFA session expired, please log in again');
    }
    if (!decoded || decoded.purpose !== 'mfa-preauth' || !decoded.sub) {
        throw new HttpError(401, 'Invalid MFA session');
    }
    return decoded.sub;
}

// Issues a brand new refresh token record for a user and returns the plaintext
// value. Only the hash is persisted; the plaintext is handed to the controller
// once so it can be placed in an httpOnly cookie, then discarded.
async function issueRefreshToken(userId: string): Promise<string> {
    const plaintext = randomToken();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await refreshTokenRepository.create(userId, sha256Hex(plaintext), expiresAt);
    return plaintext;
}

export class AuthService{
    async registerUser(data: CreateUserDto){
        //logic to register user, duplicate check, hash
        const emailExist=await userRepository.getUserByEmail(data.email);
        if(emailExist){ //if instance foung, duplicate
            throw new HttpError(409,"Email already exists");
        }
        const usernameExists=await userRepository.getUserByUsername(data.username);
        if(usernameExists){
            throw new HttpError(400,"Username already exists");

        }
        //do not save plain text password, hash the password
        const hashedPassword= await bcryptjs.hash(data.password,12); //cost factor 12
        data.password= hashedPassword;//replace plain text with hashed password
        const newUser= await userRepository.createUser(data);
        logAuditEvent({ action: 'auth.register', outcome: 'success', actorId: newUser._id.toString(), actorEmail: newUser.email });
        return newUser;
    }
    async loginUser (data:LoginUserDto, ip?: string){
        const user= await userRepository.getUserByEmail(data.email);
        // Respond identically whether the email doesn't exist or the password
        // is wrong (OWASP ASVS V2.1.5) - previously this returned a distinct
        // 404 "User not found", which lets an attacker enumerate registered
        // email addresses simply by trying them against /login.
        if(!user){
            logAuditEvent({ action: 'auth.login.failure', outcome: 'failure', actorEmail: data.email, ip, metadata: { reason: 'no such account' } });
            throw new HttpError(401, "Invalid email or password");
        }

        // Per-account lockout (OWASP ASVS V2.2.1, A07:2021): catches credential
        // stuffing spread across many source IPs, which the IP-based rate
        // limiter on this route cannot see since each request comes from a
        // different address.
        if(user.lockUntil && user.lockUntil > new Date()){
            logAuditEvent({ action: 'auth.login.locked', outcome: 'failure', actorId: user._id.toString(), actorEmail: user.email, ip });
            throw new HttpError(423, "Account temporarily locked due to too many failed login attempts. Try again later.");
        }

        const validPassword = await bcryptjs.compare(data.password, user.password);
        if(!validPassword){
            const attempts = (user.failedLoginAttempts || 0) + 1;
            if(attempts >= MAX_FAILED_LOGIN_ATTEMPTS){
                await userRepository.updateUserById(user._id.toString(), {
                    $set: { failedLoginAttempts: 0, lockUntil: new Date(Date.now() + ACCOUNT_LOCK_DURATION_MS) },
                } as any);
                logAuditEvent({ action: 'auth.account.locked', outcome: 'failure', actorId: user._id.toString(), actorEmail: user.email, ip });
                throw new HttpError(423, "Account temporarily locked due to too many failed login attempts. Try again later.");
            }
            await userRepository.updateUserById(user._id.toString(), { $set: { failedLoginAttempts: attempts } } as any);
            logAuditEvent({ action: 'auth.login.failure', outcome: 'failure', actorId: user._id.toString(), actorEmail: user.email, ip, metadata: { attempts } });
            throw new HttpError(401, "Invalid email or password");
        }

        // Successful login clears any prior failed-attempt count/lock.
        if(user.failedLoginAttempts || user.lockUntil){
            await userRepository.updateUserById(user._id.toString(), {
                $set: { failedLoginAttempts: 0 },
                $unset: { lockUntil: "" },
            } as any);
        }

        // Password alone is not enough for an MFA-enrolled account: hand back
        // a short-lived pre-auth token instead of a real session, and require
        // a valid TOTP code (via verifyMfaLogin) before issuing real tokens.
        if (user.mfaEnabled) {
            const mfaToken = signMfaPreAuthToken(user._id.toString());
            return { mfaRequired: true as const, mfaToken };
        }

        logAuditEvent({ action: 'auth.login.success', outcome: 'success', actorId: user._id.toString(), actorEmail: user.email, ip });

        // Short-lived access token (15 min) signed as a JWT, plus a long-lived
        // (7 day) opaque refresh token persisted server-side so it can be
        // revoked (JWTs alone cannot be revoked before their natural expiry).
        const token = signAccessToken(user);
        const refreshToken = await issueRefreshToken(user._id.toString());
        return { mfaRequired: false as const, token, refreshToken, user }
    }

    // Completes a login that was paused for MFA: verifies the pre-auth token
    // (proves the password step already passed) and the TOTP code, then
    // issues real tokens exactly like a normal successful login.
    async verifyMfaLogin(mfaToken: string, code: string, ip?: string){
        const userId = verifyMfaPreAuthToken(mfaToken);
        const user = await userRepository.getUserById(userId);
        if(!user || !user.mfaEnabled || !user.mfaSecret){
            throw new HttpError(401, 'MFA is not enabled for this account');
        }
        if(!verifyMfaCode(code, decryptMfaSecret(user.mfaSecret))){
            logAuditEvent({ action: 'auth.mfa.verify.failure', outcome: 'failure', actorId: user._id.toString(), actorEmail: user.email, ip });
            throw new HttpError(401, 'Invalid authentication code');
        }

        logAuditEvent({ action: 'auth.mfa.verify.success', outcome: 'success', actorId: user._id.toString(), actorEmail: user.email, ip });
        const token = signAccessToken(user);
        const refreshToken = await issueRefreshToken(user._id.toString());
        return { token, refreshToken, user };
    }

    // Step 1 of enrollment: generate a secret and QR code, but store it as
    // mfaTempSecret (not mfaSecret) and leave mfaEnabled false. This prevents
    // a user from locking themselves out by abandoning setup partway through -
    // MFA only turns on once confirmMfaSetup proves they can generate a valid
    // code with an authenticator app.
    async setupMfa(userId: string){
        const user = await userRepository.getUserById(userId);
        if(!user) throw new HttpError(404, 'User not found');
        if(user.mfaEnabled) throw new HttpError(400, 'MFA is already enabled');

        const secret = generateMfaSecret();
        // Only the encrypted form ever touches the database - the plaintext
        // secret returned below exists only in this response (and the QR
        // code derived from it), never persisted (see mfa.service's
        // encryptMfaSecret for why this must be reversible, not hashed).
        await userRepository.updateUserById(userId, { mfaTempSecret: encryptMfaSecret(secret) } as any);
        const { qrCodeDataUrl } = await buildMfaQrCode(user.email, secret);
        return { qrCodeDataUrl, secret };
    }

    // Step 2 of enrollment: proves possession of the secret before turning MFA on.
    async confirmMfaSetup(userId: string, code: string){
        const user = await userRepository.getUserById(userId);
        if(!user) throw new HttpError(404, 'User not found');
        if(!user.mfaTempSecret) throw new HttpError(400, 'No MFA setup in progress');
        if(!verifyMfaCode(code, decryptMfaSecret(user.mfaTempSecret))) throw new HttpError(400, 'Invalid authentication code');

        await userRepository.updateUserById(userId, {
            // mfaTempSecret is already encrypted (see setupMfa) - carry the
            // ciphertext over as-is, no need to decrypt and re-encrypt.
            $set: { mfaEnabled: true, mfaSecret: user.mfaTempSecret },
            $unset: { mfaTempSecret: "" },
        } as any);
        logAuditEvent({ action: 'auth.mfa.enrolled', outcome: 'success', actorId: userId, actorEmail: user.email });
        return { success: true };
    }

    // Requires a valid current code (not just the session) so an attacker who
    // hijacked a logged-in browser tab cannot silently strip MFA protection.
    async disableMfa(userId: string, code: string){
        const user = await userRepository.getUserById(userId);
        if(!user) throw new HttpError(404, 'User not found');
        if(!user.mfaEnabled || !user.mfaSecret) throw new HttpError(400, 'MFA is not enabled');
        if(!verifyMfaCode(code, decryptMfaSecret(user.mfaSecret))) throw new HttpError(400, 'Invalid authentication code');

        await userRepository.updateUserById(userId, {
            $set: { mfaEnabled: false },
            $unset: { mfaSecret: "", mfaTempSecret: "" },
        } as any);
        logAuditEvent({ action: 'auth.mfa.disabled', outcome: 'success', actorId: userId, actorEmail: user.email });
        return { success: true };
    }

    // Exchanges a still-valid refresh token for a new access/refresh pair.
    // Implements rotation-with-reuse-detection (OWASP ASVS V3.3.1): every
    // refresh consumes the presented token. If that same token is ever
    // presented again, it means either (a) two tabs raced on the same refresh,
    // which client retry logic should avoid, or (b) the token was stolen and
    // the attacker is now using a copy the legitimate user already rotated
    // past. We cannot tell those apart, so we conservatively revoke every
    // session for the user and force a fresh login.
    async refreshTokens(oldRefreshTokenPlaintext: string){
        const tokenHash = sha256Hex(oldRefreshTokenPlaintext);
        const record = await refreshTokenRepository.findByHash(tokenHash);
        if(!record) throw new HttpError(401, 'Invalid refresh token');

        if(record.revoked){
            await refreshTokenRepository.revokeAllForUser(record.user.toString());
            logAuditEvent({ action: 'auth.token.reuse_detected', outcome: 'failure', actorId: record.user.toString() });
            throw new HttpError(401, 'Refresh token reuse detected - all sessions revoked');
        }

        if(record.expiresAt < new Date()){
            throw new HttpError(401, 'Refresh token expired');
        }

        const user = await userRepository.getUserById(record.user.toString());
        if(!user) throw new HttpError(401, 'User not found');

        const newRefreshToken = await issueRefreshToken(user._id.toString());
        await refreshTokenRepository.revokeByHash(tokenHash, sha256Hex(newRefreshToken));

        const token = signAccessToken(user);
        return { token, refreshToken: newRefreshToken, user };
    }

    async logout(refreshTokenPlaintext: string | undefined){
        if(!refreshTokenPlaintext) return { success: true };
        await refreshTokenRepository.revokeByHash(sha256Hex(refreshTokenPlaintext));
        return { success: true };
    }
    async forgotPassword(email: string){
        const user = await userRepository.getUserByEmail(email);
        if(!user){
            // do not reveal whether user exists
            return { success: true };
        }
        const { v4: uuidv4 } = await import("uuid");
        const token = uuidv4(); // plaintext token - only ever sent to the user, never stored
        const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
        await userRepository.updateUserById(user._id.toString(), { resetPasswordToken: hashResetToken(token), resetPasswordExpires: expires } as any);
        // In real app send email. For now, log the reset link (contains the plaintext token).
        console.log(`Password reset link: http://localhost:3000/reset-password?token=${token}`);
        logAuditEvent({ action: 'auth.password.reset.requested', outcome: 'success', actorId: user._id.toString(), actorEmail: user.email });
        return { success: true };
    }

    async resetPassword(token: string, newPassword: string){
        const user = await userRepository.getUserByResetToken(hashResetToken(token));
        if(!user) throw new HttpError(400, 'Invalid or expired token');
        if(!user.resetPasswordExpires || user.resetPasswordExpires < new Date()){
            throw new HttpError(400, 'Token expired');
        }
        const hashed = await bcryptjs.hash(newPassword, 12);
        // NOTE: Mongoose/the MongoDB driver silently drop keys whose value is
        // `undefined` from an update document instead of clearing them, so the
        // previous `{ resetPasswordToken: undefined }` here never actually
        // removed the token - it stayed valid in the database until its 1
        // hour expiry, meaning a captured reset link could be replayed to
        // reset the password again. $unset is required to truly clear a field.
        await userRepository.updateUserById(user._id.toString(), {
            $set: { password: hashed },
            $unset: { resetPasswordToken: "", resetPasswordExpires: "" },
        } as any);
        logAuditEvent({ action: 'auth.password.reset.completed', outcome: 'success', actorId: user._id.toString(), actorEmail: user.email });
        return { success: true };
    }
}
