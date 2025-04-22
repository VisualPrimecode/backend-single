import dotenv from 'dotenv';
dotenv.config();

import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType;

const isDev = process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'test';

const createRedisClient = (): RedisClientType => {
  // ✅ Prefer full REDIS_URL in any environment
  if (process.env.REDIS_URL) {
    return createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          console.log(`🔁 Redis reconnect attempt #${retries}`);
          return retries > 5 ? new Error('❌ Redis failed to connect') : 1000;
        },
        connectTimeout: 10000,
      },
    });
  }

  // 🔧 Fallback for dev/local mode with host/port if REDIS_URL is not set
  return createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
      reconnectStrategy: (retries) => {
        console.log(`🔁 Redis reconnect attempt #${retries}`);
        return retries > 5 ? new Error('❌ Redis failed to connect') : 1000;
      },
      connectTimeout: 10000,
    },
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASSWORD,
  });
};

redisClient = createRedisClient();

redisClient.on('error', (err) => {
  console.error('❌ Redis Error:', err.message);
});

redisClient.on('connect', () => {
  console.log(`✅ Redis Connected (${process.env.NODE_ENV})`);
});

redisClient.connect().catch((err) => {
  console.error('🚫 Redis Initial Connection Failed:', err.message);
});

export default redisClient;
