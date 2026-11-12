import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { currentUser, login, logout, register, requestPasswordReset, resetPassword } from '../controllers/authController.js';

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' }
});
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes. Espera unos minutos e inténtalo de nuevo.' }
});
const asyncHandler = handler => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

router.use(authLimiter);
router.use((request, response, next) => {
  if (request.method === 'POST' && !request.is('application/json')) {
    return response.status(415).json({ message: 'El tipo de contenido debe ser application/json.' });
  }
  return next();
});
router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.post('/forgot-password', passwordResetLimiter, asyncHandler(requestPasswordReset));
router.post('/reset-password', passwordResetLimiter, asyncHandler(resetPassword));
router.get('/me', asyncHandler(currentUser));
router.post('/logout', logout);

export default router;