// middlewares/globalRateLimiter.ts
import rateLimit from 'express-rate-limit';

export const globalRateLimiter = rateLimit({
  windowMs:  60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'dev' ? 1000 : 5, 
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP. Please try again later.',
});
