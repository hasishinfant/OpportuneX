import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface CreateOAuthClientInput {
  userId: string;
  name: string;
  description?: string;
  redirectUris: string[];
  scopes: string[];
}

export interface OAuthClientResponse {
  id: string;
  clientId: string;
  clientSecret: string; // Only returned on creation
  name: string;
  description: string | null;
  redirectUris: string[];
  scopes: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface OAuthClientListItem {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  redirectUris: string[];
  scopes: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface AuthorizationCodeResponse {
  code: string;
  expiresAt: Date;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  scope: string;
}

export class OAuthService {
  /**
   * Generate client credentials
   */
  private generateClientCredentials(): {
    clientId: string;
    clientSecret: string;
    clientSecretHash: string;
  } {
    const clientId = `opx_client_${crypto.randomBytes(16).toString('hex')}`;
    const clientSecret = crypto.randomBytes(32).toString('hex');
    const clientSecretHash = crypto
      .createHash('sha256')
      .update(clientSecret)
      .digest('hex');

    return { clientId, clientSecret, clientSecretHash };
  }

  /**
   * Hash client secret
   */
  private hashClientSecret(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  /**
   * Generate authorization code
   */
  private generateAuthorizationCode(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate access token
   */
  private generateAccessToken(): { token: string; hash: string } {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, hash };
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(): { token: string; hash: string } {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, hash };
  }

  /**
   * Create OAuth client
   */
  async createClient(
    input: CreateOAuthClientInput
  ): Promise<OAuthClientResponse> {
    const { clientId, clientSecret, clientSecretHash } =
      this.generateClientCredentials();

    const client = await prisma.oAuthClient.create({
      data: {
        userId: input.userId,
        clientId,
        clientSecretHash,
        name: input.name,
        description: input.description,
        redirectUris: input.redirectUris,
        scopes: input.scopes,
      },
    });

    return {
      id: client.id,
      clientId: client.clientId,
      clientSecret, // Only returned on creation
      name: client.name,
      description: client.description,
      redirectUris: client.redirectUris,
      scopes: client.scopes,
      isActive: client.isActive,
      createdAt: client.createdAt,
    };
  }

  /**
   * List OAuth clients for a user
   */
  async listClients(userId: string): Promise<OAuthClientListItem[]> {
    const clients = await prisma.oAuthClient.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return clients.map(client => ({
      id: client.id,
      clientId: client.clientId,
      name: client.name,
      description: client.description,
      redirectUris: client.redirectUris,
      scopes: client.scopes,
      isActive: client.isActive,
      createdAt: client.createdAt,
    }));
  }

  /**
   * Update OAuth client
   */
  async updateClient(
    userId: string,
    clientId: string,
    updates: {
      name?: string;
      description?: string;
      redirectUris?: string[];
      scopes?: string[];
      isActive?: boolean;
    }
  ): Promise<OAuthClientListItem> {
    await prisma.oAuthClient.updateMany({
      where: {
        clientId,
        userId,
      },
      data: updates,
    });

    const client = await prisma.oAuthClient.findUnique({
      where: { clientId },
    });

    if (!client) {
      throw new Error('OAuth client not found');
    }

    return {
      id: client.id,
      clientId: client.clientId,
      name: client.name,
      description: client.description,
      redirectUris: client.redirectUris,
      scopes: client.scopes,
      isActive: client.isActive,
      createdAt: client.createdAt,
    };
  }

  /**
   * Delete OAuth client
   */
  async deleteClient(userId: string, clientId: string): Promise<void> {
    await prisma.oAuthClient.deleteMany({
      where: {
        clientId,
        userId,
      },
    });
  }

  /**
   * Verify client credentials
   */
  async verifyClient(clientId: string, clientSecret: string): Promise<boolean> {
    const client = await prisma.oAuthClient.findUnique({
      where: { clientId },
    });

    if (!client || !client.isActive) {
      return false;
    }

    const secretHash = this.hashClientSecret(clientSecret);
    return client.clientSecretHash === secretHash;
  }

  /**
   * Create authorization code
   */
  async createAuthorizationCode(
    clientId: string,
    userId: string,
    redirectUri: string,
    scopes: string[]
  ): Promise<AuthorizationCodeResponse> {
    const client = await prisma.oAuthClient.findUnique({
      where: { clientId },
    });

    if (!client || !client.isActive) {
      throw new Error('Invalid client');
    }

    if (!client.redirectUris.includes(redirectUri)) {
      throw new Error('Invalid redirect URI');
    }

    // Verify requested scopes are allowed
    const invalidScopes = scopes.filter(
      scope => !client.scopes.includes(scope)
    );
    if (invalidScopes.length > 0) {
      throw new Error(`Invalid scopes: ${invalidScopes.join(', ')}`);
    }

    const code = this.generateAuthorizationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.oAuthAuthorizationCode.create({
      data: {
        code,
        clientId,
        userId,
        redirectUri,
        scopes,
        expiresAt,
      },
    });

    return { code, expiresAt };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeAuthorizationCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<TokenResponse> {
    // Verify client
    const isValidClient = await this.verifyClient(clientId, clientSecret);
    if (!isValidClient) {
      throw new Error('Invalid client credentials');
    }

    // Find authorization code
    const authCode = await prisma.oAuthAuthorizationCode.findUnique({
      where: { code },
    });

    if (!authCode || authCode.used || authCode.clientId !== clientId) {
      throw new Error('Invalid authorization code');
    }

    if (authCode.expiresAt < new Date()) {
      throw new Error('Authorization code expired');
    }

    if (authCode.redirectUri !== redirectUri) {
      throw new Error('Invalid redirect URI');
    }

    // Mark code as used
    await prisma.oAuthAuthorizationCode.update({
      where: { code },
      data: { used: true },
    });

    // Generate tokens
    const { token: accessToken, hash: accessTokenHash } =
      this.generateAccessToken();
    const { token: refreshToken, hash: refreshTokenHash } =
      this.generateRefreshToken();

    const accessTokenExpiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour
    const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000); // 30 days

    // Store access token
    const accessTokenRecord = await prisma.oAuthAccessToken.create({
      data: {
        tokenHash: accessTokenHash,
        clientId,
        userId: authCode.userId,
        scopes: authCode.scopes,
        expiresAt: accessTokenExpiresAt,
      },
    });

    // Store refresh token
    await prisma.oAuthRefreshToken.create({
      data: {
        tokenHash: refreshTokenHash,
        accessTokenId: accessTokenRecord.id,
        expiresAt: refreshTokenExpiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
      scope: authCode.scopes.join(' '),
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const refreshTokenRecord = await prisma.oAuthRefreshToken.findUnique({
      where: { tokenHash: refreshTokenHash },
      include: {
        accessToken: true,
      },
    });

    if (
      !refreshTokenRecord ||
      refreshTokenRecord.revoked ||
      refreshTokenRecord.expiresAt < new Date()
    ) {
      throw new Error('Invalid refresh token');
    }

    const oldAccessToken = refreshTokenRecord.accessToken;

    // Revoke old tokens
    await prisma.oAuthAccessToken.update({
      where: { id: oldAccessToken.id },
      data: { revoked: true },
    });

    await prisma.oAuthRefreshToken.update({
      where: { tokenHash: refreshTokenHash },
      data: { revoked: true },
    });

    // Generate new tokens
    const { token: newAccessToken, hash: newAccessTokenHash } =
      this.generateAccessToken();
    const { token: newRefreshToken, hash: newRefreshTokenHash } =
      this.generateRefreshToken();

    const accessTokenExpiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour
    const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000); // 30 days

    // Store new access token
    const newAccessTokenRecord = await prisma.oAuthAccessToken.create({
      data: {
        tokenHash: newAccessTokenHash,
        clientId: oldAccessToken.clientId,
        userId: oldAccessToken.userId,
        scopes: oldAccessToken.scopes,
        expiresAt: accessTokenExpiresAt,
      },
    });

    // Store new refresh token
    await prisma.oAuthRefreshToken.create({
      data: {
        tokenHash: newRefreshTokenHash,
        accessTokenId: newAccessTokenRecord.id,
        expiresAt: refreshTokenExpiresAt,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
      scope: oldAccessToken.scopes.join(' '),
    };
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<{
    userId: string;
    clientId: string;
    scopes: string[];
  } | null> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const accessToken = await prisma.oAuthAccessToken.findUnique({
      where: { tokenHash },
    });

    if (
      !accessToken ||
      accessToken.revoked ||
      accessToken.expiresAt < new Date()
    ) {
      return null;
    }

    return {
      userId: accessToken.userId,
      clientId: accessToken.clientId,
      scopes: accessToken.scopes,
    };
  }

  /**
   * Revoke access token
   */
  async revokeAccessToken(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await prisma.oAuthAccessToken.updateMany({
      where: { tokenHash },
      data: { revoked: true },
    });
  }

  /**
   * Revoke all tokens for a client
   */
  async revokeAllClientTokens(userId: string, clientId: string): Promise<void> {
    await prisma.oAuthAccessToken.updateMany({
      where: {
        clientId,
        userId,
      },
      data: { revoked: true },
    });
  }
}

export const oauthService = new OAuthService();
