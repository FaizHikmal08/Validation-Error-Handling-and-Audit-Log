
import { Router } from 'express';
import { AuthController } from '../controllers/authController.ts';
import { authenticate } from '../middlewares/auth.ts';
import { validate } from '../middlewares/validate.ts';
import { loginSchema, registerSchema } from '../schemas/authSchema.ts';

const authRouter = Router();
const authController = new AuthController();

authRouter.post(
  '/register',
  validate(registerSchema, 'body'),
  authController.register,
);

authRouter.post(
  '/login',
  validate(loginSchema, 'body'),
  authController.login,
);

authRouter.get(
  '/me',
  authenticate,
  authController.me,
);

// Logout hanya dapat dilakukan oleh pengguna yang sudah login.
authRouter.post(
  '/logout',
  authenticate,
  authController.logout,
);

export { authRouter };
