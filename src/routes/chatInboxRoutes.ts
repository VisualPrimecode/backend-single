import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import roleMiddleware from '../middleware/roleMiddleware';
import { get } from 'http';
import { getAllCustomerByBusiness, getAllMessagesByCustomer } from '../controllers/chatInboxtController';

const router = Router();

// GET /api/v1/customer/by-business/:businessId - Get all customers by business
router.get('/by-business', authMiddleware, roleMiddleware(['admin', 'business']), getAllCustomerByBusiness);

//GET /api/v1/customer/messages/:customerId - Get all messages by customer
router.get('/messages/:customerId', authMiddleware, roleMiddleware(['admin', 'business']), getAllMessagesByCustomer);


export default router;
