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

//Implement disconnection logic here
const disconnectRedis = async () => {
    try {
        await redisClient.disconnect();
        console.log('Disconnected from Redis server');
    } catch (err) {
        console.error('Redis disconnection error:', err);
        // Implement retry logic or exit if critical
    }
}

module.exports = {
    redisClient,
    connectRedis,
    disconnectRedis
};
