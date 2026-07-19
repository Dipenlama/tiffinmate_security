import z, { TypeOf } from 'zod';
import { passwordSchema } from '../validators/password-policy';

export const userSchema= z.object({

    email: z.email(),
    username:z.string().min(3).max(20),
    password: passwordSchema,
    role: z.enum(['user', 'admin']).default('user')
});

export type UserType=z.infer<typeof userSchema> & {
    resetPasswordToken?: string;
    resetPasswordExpires?: Date | string;
    // TOTP-based MFA (OWASP ASVS V2.8). mfaSecret is only ever set once a user
    // confirms they can generate a valid code with it (see mfaTempSecret);
    // until then a half-finished enrollment cannot flip mfaEnabled on.
    mfaEnabled?: boolean;
    mfaSecret?: string;
    mfaTempSecret?: string;
    failedLoginAttempts?: number;
    lockUntil?: Date | string;
};