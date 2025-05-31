"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const roleMiddleware_1 = __importDefault(require("../middleware/roleMiddleware"));
const TicketController_1 = require("../controllers/TicketController");
const router = (0, express_1.Router)();
// POST /api/v1/tickets/create
router.post('/create', authMiddleware_1.default, (0, roleMiddleware_1.default)(['admin', 'business']), TicketController_1.createTicket);
// PUT /api/v1/tickets/edit/:id
router.put('/edit/:id', authMiddleware_1.default, (0, roleMiddleware_1.default)(['admin', 'business']), TicketController_1.editTicket);
//delete /api/v1/tickets/delete/:id
router.delete('/delete/:id', authMiddleware_1.default, (0, roleMiddleware_1.default)(['admin', 'business']), TicketController_1.deleteTicket);
//GET /api/v1/tickets
router.get('/', authMiddleware_1.default, (0, roleMiddleware_1.default)(['admin', 'business']), TicketController_1.getAllTickets);
// GET /api/v1/tickets/:id
router.get('/:id', authMiddleware_1.default, (0, roleMiddleware_1.default)(['admin', 'business']), TicketController_1.getTicketById);
exports.default = router;
