import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { chat } from '../controllers/chatController.js';

const router = Router();
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Alcanzaste el límite de consultas. Espera unos minutos o escribe a soporte.' }
});

router.post('/', chatLimiter, (request, response, next) => {
  if (!request.is('application/json')) {
    return response.status(415).json({ message: 'El tipo de contenido debe ser application/json.' });
  }
  return Promise.resolve(chat(request, response)).catch(next);
});

export default router;