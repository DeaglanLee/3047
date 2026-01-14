const { pool } = require("./client");
const { getUserByUsername } = require("./users");

// setters

async function createStore(name, address, postcode, openingHours, description) {
    try {
        await pool.query(`INSERT INTO stores (name, address, postcode, opening_hours, description) VALUES ($1, $2, $3, $4, $5);`, 
        [name, address, postcode, openingHours, description]);
    } catch (error) {
        throw new Error(`Error creating store: ${error.message}`);
    }
}

async function createStoreUser(storeId, userId) {
    try {
        await pool.query(`INSERT INTO store_users (store_id, user_id) VALUES ($1, $2);`, 
        [storeId, userId]);
    } catch (error) {
        throw new Error(`Error creating store user: ${error.message}`);
    }
}

async function linkStoreToUser(storeName, username) {
    try {
        const store = await getStoreByName(storeName);
        console.log("STORE:", store);
        const user = await getUserByUsername(username);
        console.log("USER:", user);
        await createStoreUser(store.store_id, user.user_id);
    } catch (error) {
        throw new Error(`Error linking store user: ${error.message}`);
    }
}

// getters

/**
 * Fetches the list of stores from the database
 * 
 * @returns An array of stores
 */
async function getStoreList() {
    const stores = await pool.query("SELECT * FROM stores;");
    return stores.rows;
}

/**
 * Fetches a store by using its ID
 * 
 * @param {*} storeId 
 * @returns The store data matching the ID
 */
async function getStoreById(storeId) {
    const store = await pool.query(`SELECT * FROM stores WHERE store_id = '${storeId}';`);
    return store.rows[0];
}

async function getStoreByName(storeName) {
    const store = await pool.query(`SELECT * FROM stores WHERE name = '${storeName}';`);
    return store.rows[0];
}

async function getItemsByStoreId(storeId) {
    const items = await pool.query(`SELECT * FROM items WHERE store_id = '${storeId}';`)
    return items.rows;
}

async function getStoreUsers(storeId) {
    const storeUsers = await pool.query(`SELECT * FROM store_users WHERE store_id = '${storeId}';`);
    return storeUsers.rows;
}

async function getStoreUsersByUserId(userId) {
    const storeUsers = await pool.query(`SELECT * FROM store_users WHERE user_id = '${userId}';`);
    return storeUsers.rows;
}

async function getItemByItemId(itemId) {
    const item = await pool.query(`SELECT * FROM items WHERE item_id = '${itemId}';`);
    return item.rows[0];
}



module.exports = {
    createStore,
    createStoreUser,
    getStoreList,
    getStoreById,
    getStoreByName,
    getItemsByStoreId,
    linkStoreToUser,
    getStoreUsers,
    getItemByItemId,
    getStoreUsersByUserId
}
