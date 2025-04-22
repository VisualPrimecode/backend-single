"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const redis_1 = require("redis");
let redisClient;
const isDev = process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'test';
const createRedisClient = () => {
    // ✅ Prefer full REDIS_URL in any environment
    if (process.env.REDIS_URL) {
        return (0, redis_1.createClient)({
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
    return (0, redis_1.createClient)({
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
exports.default = redisClient;
