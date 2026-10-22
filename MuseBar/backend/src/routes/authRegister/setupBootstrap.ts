import express from 'express';
import { UserModel } from '../../models/user';
import { AppError, asyncHandler, ValidationError } from '../../middleware/errorHandler';
import { requireSetupSecret } from '../../middleware/auth';
import { validatePasswordWithBreachCheck } from '../../utils/passwordValidation';

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/auth/setup — one-time system bootstrap (only works if no admin exists)
// ---------------------------------------------------------------------------
router.post('/setup', requireSetupSecret, asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new ValidationError('Email and password required');
    }
    const passwordValidation = await validatePasswordWithBreachCheck(password);
    if (!passwordValidation.isValid) {
      throw new ValidationError(passwordValidation.error ?? 'Invalid password');
    }

    const user = await UserModel.bootstrapSystemAdmin(email, password);

    return res.status(201).json({
      message: 'Admin user created successfully',
      user: { id: user.id, email: user.email, is_admin: user.is_admin },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const e = error as { statusCode?: number; message?: string };
    if (e?.statusCode === 400) {
      throw new AppError(e.message || 'Admin user already exists', 400, 'SETUP_ADMIN_ALREADY_EXISTS');
    }
    throw new AppError('Failed to create admin user', 500, 'SETUP_ADMIN_CREATE_FAILED');
  }
}));

export default router;
