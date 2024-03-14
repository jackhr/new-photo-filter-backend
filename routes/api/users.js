const express = require('express');
const router = express.Router();
const usersCtrl = require('../../controllers/api/users');

// Starts with /api/users
router.post('/', usersCtrl.create);
router.post('/signIn', usersCtrl.signIn);

module.exports = router;