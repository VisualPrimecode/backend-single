import { validateWidgetApi } from '../middleware/validateWidgetApi';
import { loadChatWidget } from '../controllers/chatWidgetController';
import { Router } from 'express';
import cors from 'cors';
const router = Router();

router.get('/chat-widget',cors({
    origin: '*', // Allow ALL domains to access this route
    methods: ['GET'],
  }) , validateWidgetApi, loadChatWidget);

export default router;
