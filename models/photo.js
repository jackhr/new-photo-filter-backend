const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const photoSchema = new Schema({
    name: String,
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    sourceURL: String,
    newEditURLs: [],
    AWSKey: String,
}, {
    timestamps: true,
});

module.exports = mongoose.model('Photo', photoSchema);