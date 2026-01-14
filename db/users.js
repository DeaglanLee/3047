const { pool } = require("./client");

async function createUser(email, username, password) {
    console.log("USERNAME VALUE:", username);
    console.log("PASSWORD VALUE:", password);

    if (!username || !password) {
        throw new Error("Username and password are required to create a user.");
    }

    try {
        await pool.query(`INSERT INTO users (email, username, password) VALUES ($1, $2, $3);`, [email, username, password]);
    } catch (error) {
        throw new Error(`Error creating user: ${error.message}`);
    }
}

/**
 * Fetch a user by their username
 * 
 * @param {*} username 
 * @returns The user data matching the username
 */
async function getUserByUsername(username) { 
    const user = await pool.query(`SELECT * FROM users WHERE username = '${username}';`);
    return user.rows[0];
}

/**
 * Fetch a user by their ID
 * 
 * @param {*} username 
 * @returns The user data matching the username
 */
async function getUserById(userId) { 
    const user = await pool.query(`SELECT * FROM users WHERE user_id = '${userId}';`);
    return user.rows[0];
}

module.exports = {
    getUserByUsername,
    createUser,
    getUserById
}