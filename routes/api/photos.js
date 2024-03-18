const express = require('express');
const router = express.Router();
const photosCtrl = require('../../controllers/api/photos');

router.get('/', photosCtrl.getAll);
router.post('/', photosCtrl.create);
router.post('/:id/filter', photosCtrl.applyFilter);
router.delete('/:id', photosCtrl.deleteOne);

module.exports = router;