import express from 'express';
import { createAndTrainAIModel, fetchAiModelsByBusinessId } from '../controllers/AiModelController';
import { upload}  from '../middleware/upload'; // Multer middleware
import authMiddleware from '../middleware/authMiddleware';
import roleMiddleware from '../middleware/roleMiddleware';

const router = express.Router();

// Route: POST /api/ai-models
router.post(
  '/create-and-train',
  upload.array('files', 5),
  authMiddleware,
  roleMiddleware(['admin', 'business']),
  createAndTrainAIModel
);

router.get(
  '/by-business',
  authMiddleware,
  roleMiddleware(['admin', 'business']),
  fetchAiModelsByBusinessId);

export default router;
