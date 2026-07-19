import mongoose, { Document, Schema } from "mongoose";

// Refresh tokens are opaque random values, never JWTs: the plaintext value is
// only ever sent to the client once (in an httpOnly cookie); the database only
// ever stores a SHA-256 hash of it. This means a stolen database dump cannot be
// used to mint new sessions (OWASP ASVS V3.2, A02:2021 Cryptographic Failures) -
// the same principle already applied to password-reset tokens.
//
// `revoked` + `replacedByHash` implement rotation-with-reuse-detection: every
// refresh consumes the old token and issues a new one. If a revoked token is
// ever presented again, that is a strong signal the token was stolen, and the
// auth service revokes the entire token family for that user.
export interface IRefreshToken extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    tokenHash: string;
    expiresAt: Date;
    revoked: boolean;
    replacedByHash?: string;
    createdAt: Date;
    updatedAt: Date;
}

const refreshTokenSchema: Schema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        tokenHash: { type: String, required: true, unique: true },
        expiresAt: { type: Date, required: true },
        revoked: { type: Boolean, default: false },
        replacedByHash: { type: String, required: false },
    },
    {
        timestamps: true,
    }
);

// MongoDB TTL index: once a token is past its expiry, Mongo garbage-collects the
// document automatically so the collection doesn't grow unbounded with dead rows.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel = mongoose.model<IRefreshToken>("RefreshToken", refreshTokenSchema);
