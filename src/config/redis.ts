// src/config/redis.ts
import dotenv from 'dotenv';
dotenv.config(); // Ensure .env variables are loaded

import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType;

const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

const createRedisClient = (): RedisClientType => {
  if (process.env.REDIS_URL) {
    console.log(`[Redis] Connecting to REDIS_URL: ${process.env.REDIS_URL}`);
    return createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) { // Increased retries
            console.error('❌ Redis: Too many retries. Connection failed.');
            return new Error('❌ Redis failed to connect after multiple retries');
          }
          console.log(`🔁 Redis reconnect attempt #${retries + 1}`);
          return Math.min(retries * 100, 3000); // Exponential backoff with a max delay
        },
        connectTimeout: 10000, // 10 seconds
      },
    });
  }

  const host = process.env.REDIS_HOST || 'localhost';
  const port = Number(process.env.REDIS_PORT || 6379);
  console.log(`[Redis] Connecting to ${host}:${port}`);
  return createClient({
    socket: {
      host: host,
      port: port,
      reconnectStrategy: (retries) => {
        if (retries > 10) {
            console.error('❌ Redis: Too many retries. Connection failed.');
            return new Error('❌ Redis failed to connect after multiple retries');
        }
        console.log(`🔁 Redis reconnect attempt #${retries + 1}`);
        return Math.min(retries * 100, 3000);
      },
      connectTimeout: 10000,
    },
    username: process.env.REDIS_USERNAME, // Allow undefined if not set
    password: process.env.REDIS_PASSWORD, // Allow undefined if not set
  });
};

redisClient = createRedisClient();

redisClient.on('error', (err) => {
  console.error('❌ Redis Error:', err.message);
});

redisClient.on('connect', () => {
  console.log(`✅ Redis Connected (NODE_ENV: ${process.env.NODE_ENV})`);
});

redisClient.on('ready', () => {
    console.log('✅ Redis client ready.');
});

redisClient.on('reconnecting', () => {
    console.log('⏳ Redis client reconnecting...');
});

// Asynchronous connection attempt
(async () => {
  try {
    await redisClient.connect();
  } catch (err: any) {
    console.error('🚫 Redis Initial Connection Failed:', err.message);
    // Depending on your application's needs, you might want to exit or have a fallback.
    // For now, we log the error and let the reconnect strategy handle it.
  }
})();

export default redisClient;