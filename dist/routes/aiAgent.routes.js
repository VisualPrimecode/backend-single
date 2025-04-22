"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const aiAgentController_1 = require("../controllers/aiAgentController");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const roleMiddleware_1 = __importDefault(require("../middleware/roleMiddleware"));
const router = (0, express_1.Router)();
// POST /api/ai-agent - Create a new AI agent
router.post('/', authMiddleware_1.default, (0, roleMiddleware_1.default)(['admin', 'business']), aiAgentController_1.createAIAgent);
router.get('/by-business', authMiddleware_1.default, (0, roleMiddleware_1.default)(['admin', 'business']), aiAgentController_1.fetchAiAgentsByBusinessId);
router.get('/:id', authMiddleware_1.default, (0, roleMiddleware_1.default)(['admin', 'business']), aiAgentController_1.fetchAiAgentById);
exports.default = router;
