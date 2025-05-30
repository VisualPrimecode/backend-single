import express from "express";
import { sendMessage } from "../controllers/sendMessageController";

const router = express.Router();

// POST /api/v1/messages/send
router.post("/send", sendMessage);

export default router;
