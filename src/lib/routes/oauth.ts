import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { oauthService } from '../services/oauth.service';

const router = Router();

// Validation schemas
const authorizeSchema = z.object({
  response_type: z.literal('code'),
  client_id: z.string(),
  redirect_uri: z.string().url(),
  scope: z.string(),
  state: z.string().optional(),
});

const tokenSchema = z.object({
  grant_type: z.enum(['authorization_code', 'refresh_token']),
  code: z.string().optional(),
  refresh_token: z.string().optional(),
  client_id: z.string(),
  client_secret: z.string(),
  redirect_uri: z.string().url().optional(),
});

/**
 * GET /oauth/authorize
 * OAuth 2.0 authorization endpoint
 * User must be authenticated to authorize an application
 */
router.get('/authorize', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const params = authorizeSchema.parse(req.query);

    // In a real implementation, this would render an authorization page
    // For now, we'll return the authorization details
    res.json({
      success: true,
      message: 'Authorization request received',
      data: {
        clientId: params.client_id,
        redirectUri: params.redirect_uri,
        scopes: params.scope.split(' '),
        state: params.state,
      },
      instructions:
        'User should review and approve/deny the authorization request',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'invalid_request',
        error_description: 'Invalid authorization request parameters',
        details: error.errors,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'server_error',
        error_description: error.message,
      });
    }
  }
});

/**
 * POST /oauth/authorize
 * User approves/denies the authorization request
 */
router.post('/authorize', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { client_id, redirect_uri, scope, state, approved } = req.body;

    if (!approved) {
      // User denied the authorization
      const deniedUrl = new URL(redirect_uri);
      deniedUrl.searchParams.set('error', 'access_denied');
      deniedUrl.searchParams.set(
        'error_description',
        'User denied authorization'
      );
      if (state) deniedUrl.searchParams.set('state', state);

      return res.json({
        success: false,
        redirectUrl: deniedUrl.toString(),
      });
    }

    // Create authorization code
    const scopes = scope.split(' ');
    const authCode = await oauthService.createAuthorizationCode(
      client_id,
      userId,
      redirect_uri,
      scopes
    );

    // Build redirect URL with authorization code
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', authCode.code);
    if (state) redirectUrl.searchParams.set('state', state);

    res.json({
      success: true,
      redirectUrl: redirectUrl.toString(),
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: 'invalid_request',
      error_description: error.message,
    });
  }
});

/**
 * POST /oauth/token
 * OAuth 2.0 token endpoint
 * Exchange authorization code for access token or refresh an access token
 */
router.post('/token', async (req: Request, res: Response) => {
  try {
    const params = tokenSchema.parse(req.body);

    if (params.grant_type === 'authorization_code') {
      if (!params.code || !params.redirect_uri) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description:
            'code and redirect_uri are required for authorization_code grant',
        });
      }

      const tokens = await oauthService.exchangeAuthorizationCode(
        params.code,
        params.client_id,
        params.client_secret,
        params.redirect_uri
      );

      res.json(tokens);
    } else if (params.grant_type === 'refresh_token') {
      if (!params.refresh_token) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description:
            'refresh_token is required for refresh_token grant',
        });
      }

      const tokens = await oauthService.refreshAccessToken(
        params.refresh_token
      );

      res.json(tokens);
    }
  } catch (error: any) {
    res.status(400).json({
      error: 'invalid_grant',
      error_description: error.message,
    });
  }
});

/**
 * POST /oauth/revoke
 * Revoke an access token
 */
router.post('/revoke', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'token is required',
      });
    }

    await oauthService.revokeAccessToken(token);

    res.json({
      success: true,
      message: 'Token revoked successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'server_error',
      error_description: error.message,
    });
  }
});

/**
 * GET /oauth/userinfo
 * Get user information using access token
 */
router.get('/userinfo', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Bearer token is required',
      });
    }

    const token = authHeader.slice(7);
    const tokenInfo = await oauthService.verifyAccessToken(token);

    if (!tokenInfo) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Invalid or expired token',
      });
    }

    // Return user information based on scopes
    // In a real implementation, fetch user data from database
    res.json({
      sub: tokenInfo.userId,
      scope: tokenInfo.scopes.join(' '),
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'server_error',
      error_description: error.message,
    });
  }
});

export default router;
