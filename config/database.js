const mongoose = require('mongoose');

mongoose.connect(process.env.DATABASE_URL, {
    dbName: process.env.DATABASE_NAME,
    autoIndex: process.env.NODE_ENV !== 'production', // Disable autoIndex in production
    serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
})
    .catch(error => {
        console.error(error);
        throw new Error(error);
    });

const db = mongoose.connection;

db.on('connected', function () {
    console.log(`Connected to ${db.name} at ${db.host}:${db.port}`);
});