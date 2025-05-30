

import express from 'express';
import { AdminLogin } from '../controllers/AdminController';

import { globalRateLimiter } from '../middleware/globalRateLimiter';

const router = express.Router();

router.post('/login', globalRateLimiter as any, AdminLogin);


export default router;
