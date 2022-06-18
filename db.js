const spicedPg = require("spiced-pg");
const db = spicedPg(
    process.env.DATABASE_URL || "postgres:postgres:postgres@localhost:5432/petition"
);

//petition
module.exports.addSignature = (signature, userId) => {
    const q = `INSERT INTO signatures (signature, user_id)
    VALUES ($1 , $2) RETURNING id`;
    const params = [signature, userId];
    return db.query(q, params);
};

//thanks
module.exports.getCountSigned = () => {
    const q = `SELECT COUNT (*) FROM signatures`;
    return db.query(q);
};

module.exports.getSignature = (signatureId) => {
    const q = `SELECT signature FROM signatures WHERE user_id = ($1)`;
    return db.query(q, [signatureId]);
};

module.exports.deleteSignature = (userId) => {
    const q = `DELETE FROM signatures WHERE user_id = ($1)`;
    return db.query(q, [userId]);
};

// signers
module.exports.getSignersDetails = () => {
    const q = `SELECT users.first, users.last, user_profiles.age, user_profiles.city, user_profiles.url
    FROM users
    JOIN signatures
    ON users.id = signatures.user_id
    LEFT JOIN user_profiles
    ON users.id = user_profiles.user_id`;
    return db.query(q);
};

// signers/:city
module.exports.getSignersByCity = (city) => {
    const q = `SELECT users.first, users.last, user_profiles.age, user_profiles.city, user_profiles.url
    FROM users
    JOIN signatures
    ON users.id = signatures.user_id
    LEFT JOIN user_profiles
    ON users.id = user_profiles.user_id
    WHERE TRIM(LOWER(user_profiles.city)) = LOWER($1)`;
    return db.query(q, [city]);
};

// register
module.exports.addUser = (first, last, email, password) => {
    const q = `INSERT INTO users (first, last, email, password)
    VALUES ($1 , $2, $3, $4) RETURNING id`;
    const params = [first, last, email, password];
    return db.query(q, params);
};

// login
module.exports.getUserInfo = (email) => {
    const q = `SELECT id, email, password FROM users WHERE email = ($1)`;
    return db.query(q, [email]);
};

// profile
module.exports.addUserProfile = (age, city, url, userId) => {
    const q = `INSERT INTO user_profiles (age, city, url, user_id)
    VALUES ($1 , $2, $3, $4) RETURNING id`;
    const params = [age || null, city || null, url || null, userId];
    return db.query(q, params);
};

// edit
module.exports.getUserInfoToEdit = (userId) => {
    const q = `SELECT users.first, users.last, users.email, user_profiles.age, user_profiles.city, user_profiles.url
    FROM users
    LEFT JOIN user_profiles
    ON users.id = user_profiles.user_id
    WHERE users.id = ($1)`;
    return db.query(q, [userId]);
};

module.exports.updateUserInfo = (first, last, email, userId) => {
    const q = `UPDATE users
    SET first = ($1), last = ($2), email = ($3) 
    WHERE id = ($4) RETURNING *`;
    const params = [first, last, email, userId];
    return db.query(q, params);
};

module.exports.updateUserInfoPsw = (first, last, email, password, userId) => {
    const q = `UPDATE users
    SET first = ($1), last = ($2), email = ($3), password = ($4)
    WHERE id = ($5) RETURNING *`;
    const params = [first, last, email, password, userId];
    return db.query(q, params);
};

module.exports.upsertUserProfileInfo = (age, city, url, userId) => {
    const q = `INSERT INTO user_profiles (age, city, url, user_id)
    VALUES ($1 , $2, $3, $4) 
    ON CONFLICT (user_id)
    DO UPDATE SET age = ($1), city = ($2), url = ($3), user_id = ($4)`;
    const params = [age || null, city || null, url || null, userId];
    return db.query(q, params);
};
