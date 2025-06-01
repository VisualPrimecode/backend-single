"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
// app.ts
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./config/db"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const businessRoutes_1 = __importDefault(require("./routes/businessRoutes"));
const AiModelRoutes_1 = __importDefault(require("./routes/AiModelRoutes"));
const aiAgent_routes_1 = __importDefault(require("./routes/aiAgent.routes"));
const chatWidgetRoutes_1 = __importDefault(require("./routes/chatWidgetRoutes"));
const messageRoutes_1 = __importDefault(require("./routes/messageRoutes"));
const chatInboxRoutes_1 = __importDefault(require("./routes/chatInboxRoutes"));
const ticketRoutes_1 = __importDefault(require("./routes/ticketRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
dotenv_1.default.config();
exports.app = (0, express_1.default)();
exports.app.set('trust proxy', 1);
// Middleware
exports.app.use((0, cors_1.default)({
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "https://chatnuvroai.vercel.app",
        "https://nuvro-user.vercel.app",
        "https://admin-pink-nu.vercel.app"
    ],
    methods: "GET,POST,PUT,DELETE,PATCH",
    credentials: true,
    allowedHeaders: "Content-Type,Authorization",
}));
exports.app.use(express_1.default.json());
exports.app.use(express_1.default.urlencoded({ extended: true }));
exports.app.use((0, cookie_parser_1.default)());
// DB
if (process.env.NODE_ENV !== "test") {
    (0, db_1.default)();
}
// Static Assets
exports.app.use("/public", express_1.default.static(path_1.default.join(__dirname, "..", "public")));
exports.app.get("/widget.js", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "..", "public", "widget.js"));
});
// Routes
exports.app.use("/api/v1/users", userRoutes_1.default);
exports.app.use("/api/v1/business", businessRoutes_1.default);
exports.app.use("/api/v1/ai-model", AiModelRoutes_1.default);
exports.app.use("/api/v1/ai-agent", aiAgent_routes_1.default);
exports.app.use("/api/v1/widget", chatWidgetRoutes_1.default);
exports.app.use("/api/v1/messages", messageRoutes_1.default);
exports.app.use("/api/v1/customer", chatInboxRoutes_1.default);
exports.app.use("/api/v1/tickets", ticketRoutes_1.default);
exports.app.use("/api/v1/admin", adminRoutes_1.default);
// Root
exports.app.get("/", (_req, res) => {
    res.send("SaaS Backend Running");
});
exports.default = exports.app;
