"use strict";
/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: apiKey
 *       in: header
 *       name: Authorization
 *       description: "Enter your bearer token in the format: Bearer <token>"
 *
 *   schemas:
 *     Business:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: "The auto-generated id of the business"
 *         name:
 *           type: string
 *           description: "Business name"
 *         owner:
 *           type: string
 *           description: "Owner's user id"
 *         industry:
 *           type: string
 *         businessType:
 *           type: string
 *           enum: [b2b, b2c, ecommerce-store, other]
 *         platform:
 *           type: string
 *         supportSize:
 *           type: string
 *         supportChannels:
 *           type: array
 *           items:
 *             type: string
 *         websiteTraffic:
 *           type: string
 *         monthlyConversations:
 *           type: string
 *         goals:
 *           type: array
 *           items:
 *             type: string
 *         subscriptionPlan:
 *           type: string
 *           enum: [free, pro, enterprise]
 *         aiIntegrations:
 *           type: object
 *           properties:
 *             website:
 *               type: boolean
 *             whatsapp:
 *               type: boolean
 *             api:
 *               type: boolean
 *             integrationDetails:
 *               type: object
 *         analytics:
 *           type: object
 *           properties:
 *             totalTickets:
 *               type: number
 *             resolvedTickets:
 *               type: number
 *             avgResponseTime:
 *               type: number
 *             customerSatisfaction:
 *               type: number
 *       example:
 *         _id: "60d0fe4f5311236168a109ca"
 *         name: "Test Business"
 *         owner: "60d0fe4f5311236168a109cb"
 *         industry: "Tech"
 *         businessType: "b2b"
 *         platform: "Web"
 *         supportSize: "Large"
 *         supportChannels: ["email", "phone"]
 *         websiteTraffic: "10000"
 *         monthlyConversations: "500"
 *         goals: ["increase sales", "improve support"]
 *         subscriptionPlan: "pro"
 *         aiIntegrations:
 *           website: true
 *           whatsapp: false
 *           api: true
 *           integrationDetails: {}
 *         analytics:
 *           totalTickets: 100
 *           resolvedTickets: 90
 *           avgResponseTime: 5
 *           customerSatisfaction: 80
 *
 * /business:
 *   post:
 *     summary: "Create a new business"
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     description: "Creates a new business. Allowed roles: admin or business."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Business'
 *     responses:
 *       201:
 *         description: "Business created successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Business'
 *       400:
 *         description: "Bad Request"
 *       500:
 *         description: "Internal Server Error"
 *
 *   get:
 *     summary: "Get all businesses with pagination and caching"
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     description: "Returns a paginated list of businesses. Allowed role: admin."
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: "Page number (default 1)"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: "Number of items per page (default 10)"
 *     responses:
 *       200:
 *         description: "List of businesses retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Business'
 *       500:
 *         description: "Internal Server Error"
 *
 * /business/{id}:
 *   get:
 *     summary: "Get a business by ID"
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     description: "Returns business details. Allowed roles: admin, business."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Business ID"
 *     responses:
 *       200:
 *         description: "Business details retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Business'
 *       404:
 *         description: "Business not found"
 *       500:
 *         description: "Internal Server Error"
 *
 *   put:
 *     summary: "Update a business by ID"
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     description: "Updates business details. Allowed role: admin."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Business ID"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               # Additional fields can be added here as needed.
 *             example:
 *               name: "Updated Business Name"
 *     responses:
 *       200:
 *         description: "Business updated successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Business'
 *       404:
 *         description: "Business not found"
 *       500:
 *         description: "Internal Server Error"
 *
 *   delete:
 *     summary: "Delete a business by ID"
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     description: "Deletes a business. Allowed role: admin."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Business ID"
 *     responses:
 *       200:
 *         description: "Business deleted successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *       404:
 *         description: "Business not found"
 *       500:
 *         description: "Internal Server Error"
 *
 * tags:
 *   - name: Business
 *     description: "Business management operations"
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* Business Routes */
const express_1 = __importDefault(require("express"));
const businessController_1 = require("../controllers/businessController");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const roleMiddleware_1 = __importDefault(require("../middleware/roleMiddleware"));
const router = express_1.default.Router();
// Create a new business (Allowed roles: admin, business)
router.post('/', authMiddleware_1.default, (0, roleMiddleware_1.default)(['admin', 'business']), businessController_1.createBusiness);
// Update business by ID (Allowed role: admin)
router.put('/:id', authMiddleware_1.default, (0, roleMiddleware_1.default)(['admin']), businessController_1.editBusinessById);
// Delete business by ID (Allowed role: admin)
router.delete('/:id', authMiddleware_1.default, (0, roleMiddleware_1.default)(['admin']), businessController_1.deleteBusiness);
// Fetch all businesses with pagination and caching (Allowed role: admin)
router.get('/', authMiddleware_1.default, (0, roleMiddleware_1.default)(['admin']), businessController_1.fetchAllBusiness);
// Fetch a single business by ID (Allowed roles: admin, business)
router.get('/:id', authMiddleware_1.default, (0, roleMiddleware_1.default)(['admin', 'business']), businessController_1.fetchBusinessById);
exports.default = router;
