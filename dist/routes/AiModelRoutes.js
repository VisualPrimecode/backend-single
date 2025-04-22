"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const AiModelController_1 = require("../controllers/AiModelController");
const upload_1 = require("../middleware/upload"); // Multer middleware
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const roleMiddleware_1 = __importDefault(require("../middleware/roleMiddleware"));
const router = express_1.default.Router();
// Route: POST /api/ai-models
router.post('/create-and-train', upload_1.upload.array('files', 5), authMiddleware_1.default, (0, roleMiddleware_1.default)(['admin', 'business']), AiModelController_1.createAndTrainAIModel);
router.get('/by-business', authMiddleware_1.default, (0, roleMiddleware_1.default)(['admin', 'business']), AiModelController_1.fetchAiModelsByBusinessId);
exports.default = router;
