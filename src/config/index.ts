import dotenv from "dotenv";
dotenv.config();

export const config = {
  redis: {
    url: process.env.REDIS_URL!,
    chatHistoryTTL: Number(process.env.CHAT_HISTORY_TTL) || 3600,
    replyCacheTTL: Number(process.env.REPLY_CACHE_TTL) || 300,
    maxHistoryItems: Number(process.env.MAX_HISTORY_ITEMS) || 20,
  },
  openai: {
    model: process.env.OPENAI_MODEL || "gpt-4",
    temperature: Number(process.env.OPENAI_TEMPERATURE) || 0.7,
    timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS) || 30000,
  },
  service: {
    agentCircuitBreakerOptions: {
      timeout: 30000,
      errorThresholdPercentage: 50,
      resetTimeout: 60000,
    },
  },
  sentryDsn: process.env.SENTRY_DSN,
};