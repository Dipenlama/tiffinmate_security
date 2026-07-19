import { AuthService } from "../../services/auth.service";
import { HttpError } from "../../errors/http-error";
import bcryptjs from "bcryptjs";
import crypto from "crypto";

var mockRepo: any;
var mockRefreshTokenRepo: any;

jest.mock("../../repositories/auth.repository", () => {
  mockRepo = {
    getUserByEmail: jest.fn(),
    getUserByUsername: jest.fn(),
    createUser: jest.fn(),
    getUserByResetToken: jest.fn(),
    updateUserById: jest.fn(),
    getUserById: jest.fn(),
  };
  return {
    UserRepository: jest.fn(() => mockRepo),
  };
});

// loginUser/refreshTokens also persist an opaque refresh token via
// RefreshTokenRepository - mock it too so these unit tests don't hit the real
// (mongodb-memory-server) database with a non-ObjectId mocked user id.
jest.mock("../../repositories/refresh-token.repository", () => {
  mockRefreshTokenRepo = {
    create: jest.fn().mockResolvedValue({}),
    findByHash: jest.fn(),
    revokeByHash: jest.fn(),
    revokeAllForUser: jest.fn(),
  };
  return {
    RefreshTokenRepository: jest.fn(() => mockRefreshTokenRepo),
  };
});

describe("AuthService unit", () => {
  let service: AuthService;

  beforeEach(() => {
    Object.values(mockRepo).forEach((fn) => {
      if (typeof fn === "function" && "mockReset" in fn) {
        (fn as jest.Mock).mockReset();
      }
    });
    mockRefreshTokenRepo.create.mockReset().mockResolvedValue({});
    mockRefreshTokenRepo.findByHash.mockReset();
    mockRefreshTokenRepo.revokeByHash.mockReset();
    mockRefreshTokenRepo.revokeAllForUser.mockReset();
    service = new AuthService();
  });

  it("registers a new user when email and username are unique", async () => {
    mockRepo.getUserByEmail.mockResolvedValue(null);
    mockRepo.getUserByUsername.mockResolvedValue(null);
    mockRepo.createUser.mockImplementation(async (data: any) => ({ ...data, _id: "id1" }));

    const result = await service.registerUser({
      email: "new@example.com",
      username: "newuser",
      password: "secret123",
      confirmPassword: "secret123",
    } as any);

    expect(mockRepo.createUser).toHaveBeenCalledTimes(1);
    const saved = mockRepo.createUser.mock.calls[0][0];
    expect(await bcryptjs.compare("secret123", saved.password)).toBe(true);
    expect(result).toEqual({ ...saved, _id: "id1" });
  });

  it("throws HttpError 409 when email already exists", async () => {
    mockRepo.getUserByEmail.mockResolvedValue({ _id: "id1" });

    await expect(
      service.registerUser({
        email: "dup@example.com",
        username: "dup",
        password: "secret123",
        confirmPassword: "secret123",
      } as any)
    ).rejects.toEqual(new HttpError(409, "Email already exists"));
  });

  it("throws HttpError 400 when username already exists", async () => {
    mockRepo.getUserByEmail.mockResolvedValue(null);
    mockRepo.getUserByUsername.mockResolvedValue({ _id: "id2" });

    await expect(
      service.registerUser({
        email: "uniq@example.com",
        username: "taken",
        password: "secret123",
        confirmPassword: "secret123",
      } as any)
    ).rejects.toEqual(new HttpError(400, "Username already exists"));
  });

  it("logs in successfully with valid credentials", async () => {
    const hashed = await bcryptjs.hash("secret123", 10);
    mockRepo.getUserByEmail.mockResolvedValue({
      _id: "id3",
      email: "login@example.com",
      username: "loginuser",
      password: hashed,
    });

    const result = await service.loginUser({
      email: "login@example.com",
      password: "secret123",
    });

    expect(result.mfaRequired).toBe(false);
    if (result.mfaRequired) throw new Error("unreachable");
    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe("login@example.com");
  });

  it("throws HttpError 401 (not 404, to avoid user enumeration) when login email not found", async () => {
    mockRepo.getUserByEmail.mockResolvedValue(null);

    await expect(
      service.loginUser({ email: "none@example.com", password: "secret123" })
    ).rejects.toEqual(new HttpError(401, "Invalid email or password"));
  });

  it("throws HttpError 401 when password is wrong", async () => {
    const hashed = await bcryptjs.hash("correct", 10);
    mockRepo.getUserByEmail.mockResolvedValue({
      _id: { toString: () => "id4" },
      email: "user@example.com",
      username: "user",
      password: hashed,
      failedLoginAttempts: 0,
    });

    await expect(
      service.loginUser({ email: "user@example.com", password: "wrong" })
    ).rejects.toEqual(new HttpError(401, "Invalid email or password"));
  });

  it("locks the account after MAX_FAILED_LOGIN_ATTEMPTS consecutive failures", async () => {
    const hashed = await bcryptjs.hash("correct", 10);
    mockRepo.getUserByEmail.mockResolvedValue({
      _id: { toString: () => "id4b" },
      email: "user2@example.com",
      username: "user2",
      password: hashed,
      failedLoginAttempts: 4, // one more failure reaches the 5-attempt threshold
    });

    await expect(
      service.loginUser({ email: "user2@example.com", password: "wrong" })
    ).rejects.toEqual(new HttpError(423, "Account temporarily locked due to too many failed login attempts. Try again later."));

    const [, update] = mockRepo.updateUserById.mock.calls[0];
    expect(update.$set.lockUntil).toBeInstanceOf(Date);
    expect(update.$set.failedLoginAttempts).toBe(0);
  });

  it("rejects login while the account is still locked, even with the correct password", async () => {
    const hashed = await bcryptjs.hash("correct", 10);
    mockRepo.getUserByEmail.mockResolvedValue({
      _id: { toString: () => "id4c" },
      email: "user3@example.com",
      username: "user3",
      password: hashed,
      lockUntil: new Date(Date.now() + 60_000),
    });

    await expect(
      service.loginUser({ email: "user3@example.com", password: "correct" })
    ).rejects.toEqual(new HttpError(423, "Account temporarily locked due to too many failed login attempts. Try again later."));
  });

  it("forgotPassword returns success and does not update for unknown email", async () => {
    mockRepo.getUserByEmail.mockResolvedValue(null);

    const result = await service.forgotPassword("unknown@example.com");

    expect(result).toEqual({ success: true });
    expect(mockRepo.updateUserById).not.toHaveBeenCalled();
  });

  it("forgotPassword sets token and expiry for existing user", async () => {
    const userId = { toString: () => "id5" } as any;
    mockRepo.getUserByEmail.mockResolvedValue({ _id: userId, email: "user@example.com" });
    mockRepo.updateUserById.mockResolvedValue({});

    const result = await service.forgotPassword("user@example.com");

    expect(result).toEqual({ success: true });
    expect(mockRepo.updateUserById).toHaveBeenCalledTimes(1);
    const [, update] = mockRepo.updateUserById.mock.calls[0];
    // The service stores a SHA-256 hash of the plaintext reset token, never the
    // plaintext itself (see hashResetToken in auth.service.ts), so assert the
    // hash of the mocked uuid rather than the raw mocked value.
    const expectedHash = crypto.createHash("sha256").update("test-uuid-1234-5678-90ab-cdef").digest("hex");
    expect(update.resetPasswordToken).toBe(expectedHash);
    expect(update.resetPasswordExpires).toBeInstanceOf(Date);
    expect(update.resetPasswordExpires.getTime()).toBeGreaterThan(Date.now());
  });

  it("resetPassword throws when token is invalid", async () => {
    mockRepo.getUserByResetToken.mockResolvedValue(null);

    await expect(service.resetPassword("bad-token", "newpass"))
      .rejects.toEqual(new HttpError(400, "Invalid or expired token"));
  });

  it("resetPassword throws when token is expired", async () => {
    mockRepo.getUserByResetToken.mockResolvedValue({
      _id: "id6",
      resetPasswordToken: "token",
      resetPasswordExpires: new Date(Date.now() - 1000),
    });

    await expect(service.resetPassword("token", "newpass"))
      .rejects.toEqual(new HttpError(400, "Token expired"));
  });

  it("resetPassword hashes password and clears token for valid token", async () => {
    mockRepo.getUserByResetToken.mockResolvedValue({
      _id: { toString: () => "id7" },
      resetPasswordToken: "good-token",
      resetPasswordExpires: new Date(Date.now() + 1000 * 60),
    });
    mockRepo.updateUserById.mockResolvedValue({});

    const result = await service.resetPassword("good-token", "brandnew");

    expect(result).toEqual({ success: true });
    expect(mockRepo.updateUserById).toHaveBeenCalledTimes(1);
    const [, update] = mockRepo.updateUserById.mock.calls[0];
    // The reset token must be truly cleared with $unset, not just set to
    // undefined (which Mongoose/the Mongo driver silently drop, leaving the
    // old value in the database - see the comment in auth.service.ts).
    expect(await bcryptjs.compare("brandnew", update.$set.password)).toBe(true);
    expect(update.$unset).toEqual({ resetPasswordToken: "", resetPasswordExpires: "" });
  });
});
