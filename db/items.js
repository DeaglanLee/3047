const { pool } = require("./client");

async function createItem(storeId, itemName, nutrition, price, picture = null) {
    try {
        await pool.query(`INSERT INTO items (store_id, name, nutrition, price, picture) VALUES ($1, $2, $3, $4, $5);`, 
        [storeId, itemName, nutrition, price, picture]);
    } catch (error) {
        throw new Error(`Error creating item: ${error.message}`);
    }
}

async function updateItem(itemId, itemName, nutrition, price, picture = null) {
    try {
        await pool.query(`UPDATE items SET name = $1, nutrition = $2, price = $3, picture = $4 WHERE item_id = $5;`,
        [itemName, nutrition, price, picture, itemId]);
    } catch (error) {
        throw new Error(`Error updating item: ${error.message}`);
    }   
}

async function getItemByFilter(fat = undefined, sugar = undefined, carbs = undefined, protein = undefined, storeId = undefined) {
    let query = "SELECT * FROM items WHERE 1=1";
    const values = [];

    if (fat !== undefined) {
        query += ` AND (nutrition->>'fats')::numeric <= $${values.length + 1}`;
        values.push(fat);
    }

    if (sugar !== undefined) {
        query += ` AND (nutrition->>'sugars')::numeric <= $${values.length + 1}`;
        values.push(sugar);
    }

    if (carbs !== undefined) {
        query += ` AND (nutrition->>'carbs')::numeric <= $${values.length + 1}`;
        values.push(carbs);
    }

    if (protein !== undefined) {
        query += ` AND (nutrition->>'protein')::numeric <= $${values.length + 1}`;
        values.push(protein);
    }

    if (storeId !== undefined) {
        query += ` AND store_id = $${values.length + 1}`;
        values.push(storeId);
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
