import { Router } from 'express';
import { createAIAgent, fetchAiAgentById, fetchAiAgentsByBusinessId } from '../controllers/aiAgentController';
import authMiddleware from '../middleware/authMiddleware';
import roleMiddleware from '../middleware/roleMiddleware';

const router = Router();

// POST /api/ai-agent - Create a new AI agent
router.post('/', authMiddleware, roleMiddleware(['admin', 'business']), createAIAgent);
router.get('/by-business', authMiddleware, roleMiddleware(['admin', 'business']), fetchAiAgentsByBusinessId);
router.get('/:id', authMiddleware, roleMiddleware(['admin', 'business']), fetchAiAgentById);

export default router;
