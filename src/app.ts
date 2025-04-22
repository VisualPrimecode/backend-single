import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db";
import redisClient from "./config/redis";
import { swaggerSpec, swaggerUi } from "./swagger";
import cors from "cors";
import path from "path";
import { globalRateLimiter } from "./middleware/globalRateLimiter";
import cookieParser from 'cookie-parser';

dotenv.config();

export const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173", // for local dev
      "https://nuvro-user.vercel.app" // for production
    ], // Allows requests from anywhere
    methods: "GET,POST,PUT,DELETE,PATCH",
    credentials: true,
    allowedHeaders: "Content-Type,Authorization",
  })
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Connect to MongoDB and Redis
if (process.env.NODE_ENV !== "test") {
  connectDB();
}


// Serve public folder where widget.js lives
app.use('/public', express.static(path.join(__dirname, '..', 'public')));
app.get('/widget.js', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'widget.js'));
});

//import routes
import userRoutes from "./routes/userRoutes";
import businessRoutes from "./routes/businessRoutes";
import aiModelRoutes from "./routes/AiModelRoutes"
import aiAgentRoutes from "./routes/aiAgent.routes"
import chatWidgetRoutes from "./routes/chatWidgetRoutes";


// Register API Routes
app.use('/api/v1/users', userRoutes);
app.use("/api/v1/business", businessRoutes);
app.use("/api/v1/ai-model", aiModelRoutes);
app.use('/api/v1/ai-agent', aiAgentRoutes);
app.use('/api/v1/widget', chatWidgetRoutes);

// Serve Swagger docs at /api-docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Test Route
app.get("/", (_req, res) => {
  res.send("SaaS Backend Running");
});





// Only start the server if not running tests
if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server running on port: ${PORT}`));
}

export default app;
