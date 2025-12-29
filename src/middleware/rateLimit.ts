import rateLimit from 'express-rate-limit';

const minutes = (n: number) => n * 60 * 1000;

export const authLimiter = rateLimit({
  windowMs: minutes(15),
  limit: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again later.' },
});

export const publicApiLimiter = rateLimit({
  windowMs: minutes(1),
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded.' },
});
