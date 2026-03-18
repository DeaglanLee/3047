const { pool } = require("./client");

// SETTERS
async function processPayment(basket, basketTotal, address, postcode, cardNumber, nameOnCard, expiryDate, user) {
    await createOrder(basket, basketTotal, address, postcode, cardNumber, nameOnCard, expiryDate, user);
    await createOrderItems(basket, user);
}

async function processReservation(basketId) {
    try {
        await pool.query('UPDATE baskets SET active = false WHERE basket_id = $1', [basketId]);
    } catch (error) {
        throw new Error(`Error processing reservation: ${error.message}`);
    }
}

async function createOrder(basket, basketTotal, address, postcode, cardNumber, nameOnCard, expiryDate, user) {
    deliveryFee = 0.001;
    totalPrice = Number(basketTotal) + deliveryFee;
    try {
        await pool.query(`INSERT INTO orders (user_id, store_id, subtotal, delivery_fee, total_price, status, delivery_address, delivery_postcode, card_number, name_on_card, expiry_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
            [user.user_id, basket[0].store_id, basketTotal, deliveryFee, totalPrice, "On the Way", address, postcode, cardNumber, nameOnCard, expiryDate]);
    } catch (error) {
        throw new Error(`Error processing Payment: ${error.message}`);
    }
}

async function createOrderItems(basket, user) {
    try {
        const order = await getOrderIdFromLastCheckout(user.user_id)

        for(const item of basket){
            const total = Number(item.price) * Number(item.quantity);

            await pool.query('INSERT INTO order_items (order_id, item_id, quantity, price, total) VALUES ($1, $2, $3, $4, $5)', 
            [order.order_id, item.item_id, item.quantity, item.price, total])
        }
    } catch (error) {
        throw new Error(`Error creating order items: ${error.message}`);
    }
}

// GETTERS
async function getPreviousOrders(user_id, limit = 5) {
    try {
        const orders = await getLastOrders(user_id, limit);
        for (let i = 0; i < limit; i++) {
            const combinedOrderDetails = await getCombinedOrderDetails(orders[i].order_id);
            console.log("Combined Order Details:", combinedOrderDetails); // Debugging log
            orders.push(combinedOrderDetails);
        }

        return orders;
    } catch (error) {
        throw new Error(`Error getting previous orders: ${error.message}`);
    }
}

async function getOrderIdFromLastCheckout(user_id) {
    try {
        const result = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [user_id]);
        return result.rows[0];
    } catch (error) {
        throw new Error(`Error getting order ID: ${error.message}`);
    }
}

async function getCombinedOrderDetails(order_id) {
    try {
        const orderResult = await pool.query('SELECT * FROM orders WHERE order_id = $1', [order_id]);
        const orderItemsResult = await getOrderItems(order_id); 
        return {
            order: orderResult.rows[0],
            items: orderItemsResult
        };
    }
    catch (error) { 
        throw new Error(`Error getting combined order details: ${error.message}`);
    }
}

async function getOrderItems(order_id) {
    try {
        const result = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [order_id]);
        return result.rows;
    } catch (error) {
        throw new Error(`Error getting order items: ${error.message}`);
    }
}

/**
 * Get last orders for a user 
 * 
 * @param {*} user_id 
 * @param {*} limit default to 5
 * @returns 
 */
async function getLastOrders(user_id, limit = 5){
    try {
        const result = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [user_id, limit]);
        return result.rows;
    } catch (error) {
        throw new Error(`Error getting last orders: ${error.message}`);
    }
}

module.exports = {
    processPayment,
    processReservation,
    getCombinedOrderDetails,
    getPreviousOrders
}