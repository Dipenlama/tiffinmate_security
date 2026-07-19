import { RefreshTokenModel, IRefreshToken } from "../models/refresh-token.model";

export class RefreshTokenRepository {
    async create(userId: string, tokenHash: string, expiresAt: Date): Promise<IRefreshToken> {
        return RefreshTokenModel.create({ user: userId, tokenHash, expiresAt });
    }

    async findByHash(tokenHash: string): Promise<IRefreshToken | null> {
        return RefreshTokenModel.findOne({ tokenHash });
    }

    async revokeByHash(tokenHash: string, replacedByHash?: string): Promise<void> {
        await RefreshTokenModel.updateOne(
            { tokenHash },
            { revoked: true, ...(replacedByHash ? { replacedByHash } : {}) }
        );
    }

    async revokeAllForUser(userId: string): Promise<void> {
        await RefreshTokenModel.updateMany({ user: userId, revoked: false }, { revoked: true });
    }
}
