"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const validateWidgetApi_1 = require("../middleware/validateWidgetApi");
const chatWidgetController_1 = require("../controllers/chatWidgetController");
const express_1 = require("express");
const cors_1 = __importDefault(require("cors"));
const router = (0, express_1.Router)();
router.get('/chat-widget', (0, cors_1.default)({
    origin: '*', // Allow ALL domains to access this route
    methods: ['GET'],
}), validateWidgetApi_1.validateWidgetApi, chatWidgetController_1.loadChatWidget);
exports.default = router;
