const express = require('express');
const logger = require('morgan');
const usersRouter = require('./routes/api/users');

require('dotenv').config();
require('./config/database');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(require('./config/checkToken'));

app.use('/api/users', usersRouter);

const port = process.env.PORT || 3001;

app.listen(port, function() {
  console.log(`Express app running on port ${port}`);
});