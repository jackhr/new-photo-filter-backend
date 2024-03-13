const mongoose = require('mongoose');

mongoose.connect(process.env.DATABASE_URL)
  .catch(error => {
    console.error(error);
    throw new Error(error);
  });

const db = mongoose.connection;

db.on('connected', function () {
  console.log(`Connected to ${db.name} at ${db.host}:${db.port}`);
});