const express = require('express');
const logger = require('morgan');
const usersRouter = require('./routes/api/users');

require('dotenv').config();
require('./config/database');

const app = express();

app.use(logger('dev'));
app.use(express.json());

const port = process.env.PORT || 3001;

app.use(require('./config/checkToken'));

app.use('/api/users', usersRouter);

app.listen(port, function() {
  console.log(`Express app running on port ${port}`);
});