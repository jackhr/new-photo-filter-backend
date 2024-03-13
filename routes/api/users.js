const express = require('express');
const router = express.Router();

// Starts with /api/users
router.post('/', function(req, res) {
    res.json({ message: 'User created', data: req.body});
});

module.exports = router;