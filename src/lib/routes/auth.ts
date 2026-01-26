import type { Response } from 'express';
import { Router } from 'express';
import { body } from 'express-validator';
import type { ApiResponse } from '../../types';
import type { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { validate } from '../middleware/validation';
import type {
  ChangePasswordRequest,
  LoginRequest,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  RefreshTokenRequest,
  RegisterRequest,
} from '../services/auth.service';
import { authService } from '../services/auth.service';

const router = Router();

/**
 * User registration
 */
router.post(
  '/register',
  validate([
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .withMessage(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('phone')
      .optional()
      .isMobilePhone('en-IN')
      .withMessage('Invalid Indian phone number'),
  ]),
  asyncHandler(async (req, res: Response) => {
    const registerData: RegisterRequest = {
      email: req.body.email,
      password: req.body.password,
      name: req.body.name,
      phone: req.body.phone,
    };

    const result = await authService.register(registerData);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * User login
 */
router.post(
  '/login',
  validate([
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  asyncHandler(async (req, res: Response) => {
    const loginData: LoginRequest = {
      email: req.body.email,
      password: req.body.password,
    };

    const result = await authService.login(loginData);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(401).json(result);
    }
  })
);

/**
 * Refresh access token
 */
router.post(
  '/refresh',
  validate([
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  ]),
  asyncHandler(async (req, res: Response) => {
    const refreshData: RefreshTokenRequest = {
      refreshToken: req.body.refreshToken,
    };

    const result = await authService.refreshToken(refreshData);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(401).json(result);
    }
  })
);

/**
 * Change password (requires authentication)
 */
router.post(
  '/change-password',
  validate([
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .withMessage(
        'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const changePasswordData: ChangePasswordRequest = {
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
    };

    const result = await authService.changePassword(
      req.user.id,
      changePasswordData
    );

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Initiate password reset
 */
router.post(
  '/forgot-password',
  validate([
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
  ]),
  asyncHandler(async (req, res: Response) => {
    const resetData: PasswordResetRequest = {
      email: req.body.email,
    };

    const result = await authService.initiatePasswordReset(resetData);

    // Always return success for security (don't reveal if email exists)
    res.status(200).json(result);
  })
);

/**
 * Confirm password reset
 */
router.post(
  '/reset-password',
  validate([
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .withMessage(
        'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      ),
  ]),
  asyncHandler(async (req, res: Response) => {
    const resetConfirmData: PasswordResetConfirmRequest = {
      token: req.body.token,
      newPassword: req.body.newPassword,
    };

    const result = await authService.confirmPasswordReset(resetConfirmData);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Get current user info (requires authentication)
 */
router.get(
  '/me',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const response: ApiResponse<typeof req.user> = {
      success: true,
      data: req.user,
      message: 'User information retrieved successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Logout (client-side token invalidation)
 */
router.post(
  '/logout',
  asyncHandler(async (req, res: Response) => {
    // For JWT, logout is typically handled client-side by removing the token
    // In a more sophisticated setup, you might maintain a blacklist of tokens

    const response: ApiResponse<null> = {
      success: true,
      message: 'Logged out successfully',
    };

    res.status(200).json(response);
  })
);

export { router as authRouter };
