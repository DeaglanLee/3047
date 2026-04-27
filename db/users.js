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
        throw new Error(`Error creating user`);
    }
}

/**
 * Fetch a user by their username
 * 
 * @param {*} username 
 * @returns The user data matching the username
 */
async function getUserByUsername(username) { 
    const user = await pool.query(`SELECT * FROM users WHERE username = $1;`, [username]);
    return user.rows[0];
}

/**
 * Fetch a user by their ID
 * 
 * @param {*} username 
 * @returns The user data matching the username
 */
async function getUserById(userId) { 
    const user = await pool.query(`SELECT * FROM users WHERE user_id = $1;`, [userId]);
    return user.rows[0];
}

async function getUserBasket(userId) {
    const basket = await pool.query(`SELECT * FROM basket_view WHERE user_id = $1 AND active = true;`, [userId]);
    return basket.rows;
}

async function getBasketTotal(userId) {
    const total = await pool.query(`SELECT SUM(price * quantity) AS total FROM basket_view WHERE user_id = $1 AND active = true;`, [userId]);
    return total.rows[0].total || 0;
}

async function createBasket(userId) {
    try {
        await pool.query(`INSERT INTO baskets (user_id, active) VALUES ($1, $2);`, [userId, true]);
    } catch (error) {
        throw new Error(`Error creating basket: ${error.message}`);
    }
}

async function getBasketItems(basketId) {
    const items = await pool.query(`SELECT * FROM basket_items WHERE basket_id = $1;`, [basketId]);
    return items.rows;
}


async function addItemToBasket(basketId, itemId, quantity) {
    try {
        await pool.query(`INSERT INTO basket_items (basket_id, item_id, quantity) VALUES ($1, $2, $3);`, [basketId, itemId, quantity]);
    } catch (error) {
        throw new Error(`Error adding item to basket: ${error.message}`);
    }
}

async function removeItemFromBasket(basketId, itemId) {
    try {
        await pool.query(`DELETE FROM basket_items WHERE basket_id = $1 AND item_id = $2;`, [basketId, itemId]);
    } catch (error) {
        throw new Error(`Error removing item from basket: ${error.message}`);
    }   
}

async function updateBasketItemQuantity(basketId, itemId, quantity) {
    try {
        await pool.query(`UPDATE basket_items SET quantity = $1 WHERE basket_id = $2 AND item_id = $3;`, [quantity, basketId, itemId]);
    } catch (error) {
        throw new Error(`Error updating item quantity in basket: ${error.message}`);
    }
}

module.exports = {
    getUserByUsername,
    createUser,
    getUserById,
    getUserBasket,
    createBasket,
    getBasketTotal,
    getBasketItems,
    addItemToBasket,
    removeItemFromBasket,
    updateBasketItemQuantity,
}