// redisClient.js
const Redis = require('redis');

const redisClient = Redis.createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

const connectRedis = async () => {
    if (redisClient.isOpen) return console.log('Redis is already connected');
    try {
        await redisClient.connect();
        console.log('Connected to Redis server');
    } catch (err) {
        console.error('Redis connection error:', err);
        // Implement retry logic or exit if critical
    }
};

// Ensure this is called at application startup
connectRedis();

module.exports = redisClient;
