const bcrypt = require("bcryptjs");
const { promisify } = require("util");

const genSalt = promisify(bcrypt.genSalt);
const hash = promisify(bcrypt.hash);
const compare = promisify(bcrypt.compare);

// this will be for when the user registers
exports.hash = (plainTxtPw) => {
    return genSalt().then((salt) => {
        return hash(plainTxtPw, salt);
    });
};

// COMPARE will compare what the user typed in with our hashed password in the db
// this will be for when the user logs in
exports.compare = compare;

