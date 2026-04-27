const { pool } = require("./client");

async function createItem(storeId, itemName, nutrition, price, picture = null, quantity = 0) {
    try {
        await pool.query(`INSERT INTO items (store_id, name, nutrition, price, picture, quantity) VALUES ($1, $2, $3, $4, $5, $6);`, 
        [storeId, itemName, nutrition, price, picture, quantity]);
    } catch (error) {
        throw new Error(`Error creating item: ${error.message}`);
    }
}

async function updateItem(itemId = undefined, itemName = undefined, nutrition = undefined, price = undefined, picture = null, quantity = undefined) {
    let query = "UPDATE items SET";
    const values = [];
    let setClauses = [];

    if (itemName !== undefined) {
        setClauses.push(`name = $${values.length + 1}`);
        values.push(itemName);
    }

    if (nutrition !== undefined) {
        setClauses.push(`nutrition = $${values.length + 1}`);
        values.push(nutrition);
    }
    
    if (price !== undefined) {
        setClauses.push(`price = $${values.length + 1}`);
        values.push(price);
    }

    if (picture !== undefined) {
        setClauses.push(`picture = $${values.length + 1}`);
        values.push(picture);
    }

    if (quantity !== undefined) {
        setClauses.push(`quantity = $${values.length + 1}`);
        values.push(quantity);
    }

    if (setClauses.length === 0) {
        throw new Error("No fields to update");
    }

    query += " " + setClauses.join(", ") + ` WHERE item_id = $${values.length + 1}`;
    values.push(itemId);

    try {
        await pool.query(query, values);
    } catch (error) {
        throw new Error(`Error updating item: ${error.message}`);
    }   
}

async function getItemByFilter(fat = undefined, saturates = undefined, sugar = undefined, salt = undefined, protein = undefined, storeId = undefined, quantity = false) {
    let query = "SELECT * FROM items WHERE 1=1";
    const values = [];

    if (fat !== undefined) {
        query += ` AND (nutrition->>'fats')::numeric <= $${values.length + 1}`;
        values.push(fat);
    }

    if (saturates !== undefined) {
        query += ` AND (nutrition->>'saturates')::numeric <= $${values.length + 1}`;
        values.push(saturates);
    }

    if (sugar !== undefined) {
        query += ` AND (nutrition->>'sugars')::numeric <= $${values.length + 1}`;
        values.push(sugar);
    }

    if (salt !== undefined) {
        query += ` AND (nutrition->>'salt')::numeric <= $${values.length + 1}`;
        values.push(salt);
    }

    if (protein !== undefined) {
        query += ` AND (nutrition->>'proteins')::numeric <= $${values.length + 1}`;
        values.push(protein);
    }

    if (storeId !== undefined) {
        query += ` AND store_id = $${values.length + 1}`;
        values.push(storeId);
    }

    if (quantity) {
        query += ` AND quantity > 0`;
    }

    console.log("Generated Query:", query);
    console.log("With Values:", values);

    try {
        const result = await pool.query(query, values);
        return result.rows;
    } catch (error) {
        throw new Error(`Error fetching items by filter: ${error.message}`);
    }
}

module.exports = {
    createItem,
    updateItem,
    getItemByFilter
}
