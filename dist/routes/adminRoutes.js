"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const AdminController_1 = require("../controllers/AdminController");
const globalRateLimiter_1 = require("../middleware/globalRateLimiter");
const router = express_1.default.Router();
router.post('/login', globalRateLimiter_1.globalRateLimiter, AdminController_1.AdminLogin);
exports.default = router;
