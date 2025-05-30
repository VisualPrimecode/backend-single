// app.ts
import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db";
import redisClient from "./config/redis";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";

import userRoutes from "./routes/userRoutes";
import businessRoutes from "./routes/businessRoutes";
import aiModelRoutes from "./routes/AiModelRoutes";
import aiAgentRoutes from "./routes/aiAgent.routes";
import chatWidgetRoutes from "./routes/chatWidgetRoutes";
import messageRoutes from "./routes/messageRoutes";
import chatInboxRoutes from "./routes/chatInboxRoutes";

import adminRoutes from "./routes/adminRoutes";

dotenv.config();

export const app = express();

// Trust proxy
app.set("trust proxy", process.env.NODE_ENV === "production");

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",


      "https://nuvro-user.vercel.app"
    ],
    methods: "GET,POST,PUT,DELETE,PATCH",
    credentials: true,
    allowedHeaders: "Content-Type,Authorization",
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// DB
if (process.env.NODE_ENV !== "test") {
  connectDB();
}

// Static Assets
app.use("/public", express.static(path.join(__dirname, "..", "public")));
app.get("/widget.js", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "widget.js"));
});

// Routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/business", businessRoutes);
app.use("/api/v1/ai-model", aiModelRoutes);
app.use("/api/v1/ai-agent", aiAgentRoutes);
app.use("/api/v1/widget", chatWidgetRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/customer", chatInboxRoutes);

app.use("/api/v1/admin", adminRoutes);


// Root
app.get("/", (_req, res) => {
  res.send("SaaS Backend Running");
});

export default app;
