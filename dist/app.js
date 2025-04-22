"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./config/db"));
const swagger_1 = require("./swagger");
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
dotenv_1.default.config();
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)({
    origin: [
        "http://localhost:5173", // for local dev
        "https://nuvro-user.vercel.app" // for production
    ], // Allows requests from anywhere
    methods: "GET,POST,PUT,DELETE,PATCH",
    credentials: true,
    allowedHeaders: "Content-Type,Authorization",
}));
exports.app.use(express_1.default.json());
exports.app.use(express_1.default.urlencoded({ extended: true }));
exports.app.use((0, cookie_parser_1.default)());
// Connect to MongoDB and Redis
if (process.env.NODE_ENV !== "test") {
    (0, db_1.default)();
}
// Serve public folder where widget.js lives
exports.app.use('/public', express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
exports.app.get('/widget.js', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '..', 'public', 'widget.js'));
});
//import routes
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const businessRoutes_1 = __importDefault(require("./routes/businessRoutes"));
const AiModelRoutes_1 = __importDefault(require("./routes/AiModelRoutes"));
const aiAgent_routes_1 = __importDefault(require("./routes/aiAgent.routes"));
const chatWidgetRoutes_1 = __importDefault(require("./routes/chatWidgetRoutes"));
// Register API Routes
exports.app.use('/api/v1/users', userRoutes_1.default);
exports.app.use("/api/v1/business", businessRoutes_1.default);
exports.app.use("/api/v1/ai-model", AiModelRoutes_1.default);
exports.app.use('/api/v1/ai-agent', aiAgent_routes_1.default);
exports.app.use('/api/v1/widget', chatWidgetRoutes_1.default);
// Serve Swagger docs at /api-docs
exports.app.use("/api-docs", swagger_1.swaggerUi.serve, swagger_1.swaggerUi.setup(swagger_1.swaggerSpec));
// Test Route
exports.app.get("/", (_req, res) => {
    res.send("SaaS Backend Running");
});
// Only start the server if not running tests
if (process.env.NODE_ENV !== "test") {
    const PORT = process.env.PORT || 5000;
    exports.app.listen(PORT, () => console.log(`🚀 Server running on port: ${PORT}`));
}
exports.default = exports.app;
