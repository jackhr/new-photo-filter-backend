const User = require('../../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

module.exports = {
    create,
    login
};

async function create(req, res) {
    let token = null;
    let message = 'Logged In';
    try {
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser !== null) throw new Error('Please choose a different email.');
        const user = await User.create(req.body);
        token = createJWT(user);
    } catch (err) {
        res.status(400);
        message = err.message;
    }
    res.json({ message, token });
}

async function login(req, res) {
    let token = null;
    let message = 'Logged In';
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) throw new Error('User not found.');
        const match = await bcrypt.compare(req.body.password, user.password);
        if (!match) throw new Error('Bad credentials.');
        token = createJWT(user);
    } catch(err) {
        res.status(400);
        message = err.message;
    }
    res.json({ message, token });
}

/*--- Helper Functions ---*/

function createJWT(user) {
    return jwt.sign(
        // data payload
        { user },
        process.env.SECRET,
        { expiresIn: '24h' }
    );
}