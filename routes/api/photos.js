const express = require('express');
const router = express.Router();
const photosCtrl = require('../../controllers/api/photos');

router.get('/', photosCtrl.getAll);
router.post('/', photosCtrl.create);

module.exports = router;