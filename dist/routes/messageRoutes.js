"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sendMessageController_1 = require("../controllers/sendMessageController");
const router = express_1.default.Router();
// POST /api/v1/messages/send
router.post("/send", sendMessageController_1.sendMessage);
exports.default = router;
