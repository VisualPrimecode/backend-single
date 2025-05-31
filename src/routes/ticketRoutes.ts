import { Router } from 'express';

import authMiddleware, { authMiddlewareForAdmin } from '../middleware/authMiddleware';
import roleMiddleware from '../middleware/roleMiddleware';
import { createTicket, deleteTicket, editTicket, getAllTickets, getTicketById } from '../controllers/TicketController';

const router = Router();

// POST /api/v1/tickets/create
router.post('/create', authMiddleware, roleMiddleware(['admin', 'business']), createTicket);

// PUT /api/v1/tickets/edit/:id
router.put('/edit/:id', authMiddleware, roleMiddleware(['admin', 'business']), editTicket);

//delete /api/v1/tickets/delete/:id
router.delete('/delete/:id', authMiddleware, roleMiddleware(['admin', 'business']), deleteTicket);

//GET /api/v1/tickets
router.get('/', authMiddleware, roleMiddleware(['admin', 'business']), getAllTickets);

// GET /api/v1/tickets/:id
router.get('/:id', authMiddleware, roleMiddleware(['admin', 'business']), getTicketById);


export default router;
