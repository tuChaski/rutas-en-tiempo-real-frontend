import rateLimit from 'express-rate-limit';

export const trackingLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  keyGenerator: (req) => `micro:${req.driver.micro_id}`,
  standardHeaders: true,
  legacyHeaders: false,
});
