"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const roleMiddleware_1 = __importDefault(require("../middleware/roleMiddleware"));
const chatInboxtController_1 = require("../controllers/chatInboxtController");
const router = (0, express_1.Router)();
// GET /api/v1/customer/by-business/:businessId - Get all customers by business
router.get('/by-business', authMiddleware_1.default, (0, roleMiddleware_1.default)(['admin', 'business']), chatInboxtController_1.getAllCustomerByBusiness);
//GET /api/v1/customer/messages/:customerId - Get all messages by customer
router.get('/messages/:customerId', authMiddleware_1.default, (0, roleMiddleware_1.default)(['admin', 'business']), chatInboxtController_1.getAllMessagesByCustomer);
exports.default = router;
