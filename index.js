const express = require('express');
const app = express();
const path = require('path');
let sessions = require('express-session');

// Import database and backend functions
const {
	createStore,
    createStoreUser,
    getStoreList,
    getStoreById,
    getStoreByName,
    getItemsByStoreId,
	linkStoreToUser,
	getStoreUsers,
	getItemByItemId,
	getStoreUsersByUserId,
	getAllItems,
	getStores
} = require("./db/stores");
const {
	processPayment,
    processReservation,
	getPreviousOrders,
    getLastReservations,
    getLastStoreReservations,
} = require("./db/payment")
const {
	getUserByUsername,
	getUserById, 
	getUserBasket,
	createBasket,
	getBasketItems,
    getBasketTotal,
    addItemToBasket,
	removeItemFromBasket,
	updateBasketItemQuantity
} =  require("./db/users");
const {createItem, updateItem, getItemByFilter} = require("./db/items");
const {verifyUserLogin, registerUser} = require("./backend/auth");
const { get } = require('http');
const e = require('express');
const { error } = require('console');
const { isStoreAdmin } = require('./helpers');
const { create } = require('domain');

const port = 3000;

app.use("/bootstrap", express.static(__dirname + "/node_modules/bootstrap/dist"))
app.use('/js', express.static(path.join(__dirname, 'helpers')));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");
app.use(
	sessions({
		secret: "secretkey",
		resave: false,
		saveUninitialized: false,
		cookie: { secure: false, maxAge: 3600000 },
    })
);

// GET routes
// Home route
app.get('/', async (req, res) => {
	const user = req.session.user || false
    let storeAdmin = await isStoreAdmin(user?.user_id) || false;
    if (storeAdmin) {
        storeAdmin = await getStoreUsersByUserId(user.user_id);
    }
	// console.log("USER SESSION:", req.session.user);
	// console.log("STORE ADMIN:", storeAdmin);
    res.render("pages/home", { title: "Home", user: user, storeAdmin: storeAdmin });
});

// User routes
app.get('/login', async (req, res) => {
	const user = req.session.user || false;
    let storeAdmin = await isStoreAdmin(user?.user_id) || false;
	const error = false;
	res.render("pages/login", {title: "Login", user: user, error: error, storeAdmin: storeAdmin});
});

app.get('/signup', async (req, res) => {
	const user = req.session.user || false;
    let storeAdmin = await isStoreAdmin(user?.user_id) || false;
	const error = false;
	res.render("pages/signup", { title: "Signup", user: user, error: error, storeAdmin: storeAdmin });
});

// Store routes
app.get('/registerstore', async (req, res) => {
	const user = req.session.user || false;
    let storeAdmin = await isStoreAdmin(user?.user_id) || false;
	const error = false;
	res.render("pages/registerStore", {title: "Register Store", user: user, error: error, storeAdmin: storeAdmin});
});

app.get('/storelogin', async (req, res) => {
	const user = req.session.user || false;
    let storeAdmin = await isStoreAdmin(user?.user_id) || false;
	const error = false;
	res.render("pages/login", {title: "Store Login", user: user, error: error, storeAdmin: storeAdmin});
});

app.get('/storesignup', async (req, res) => {
	const user = req.session.user || false;
    let storeAdmin = await isStoreAdmin(user?.user_id) || false;
	const error = false;
	res.render("pages/signup", { title: "Signup", user: user, error: error, storeAdmin: storeAdmin });
});

app.get('/stores', async (req, res) => {
	const user = req.session.user || false;
    let storeAdmin = await isStoreAdmin(user?.user_id) || false;
	const stores = await getStoreList();
	res.render("pages/storelist", { title: "Stores", stores: stores, user: user, storeAdmin: storeAdmin });
});

app.get('/profile/:userId', async (req, res) => {
	// get user profile info
	const userId = req.params.userId;

	if (userId != req.session.user?.user_id) {
		return res.redirect('/');
	}
    let user = await getUserById(userId);

    let storeAdmin = await isStoreAdmin(user?.user_id) || false;
	let owner = false;


	// get user store info to check ownership of stores
	let store;

    if (storeAdmin) {
        //console.log("USER IS STORE ADMIN\nUser ID: ", userId);
        store = await getStoreUsersByUserId(userId);
        user.stores = store;
        //console.log("user:", user);
        const reservations = await getLastStoreReservations(store[0].store_id);
        //console.log("STORE RESERVATIONS:", reservations);
        const groupedReservations = {};
        // group reservations by basket id and store name
        reservations.forEach(item => {
            if (!groupedReservations[item.basket_id]) {
                groupedReservations[item.basket_id] = {};
            }

            if (!groupedReservations[item.basket_id][item.store_name]) {
                groupedReservations[item.basket_id][item.store_name] = [];
            }

            groupedReservations[item.basket_id][item.store_name].push(item);
        });
        user.reservations = groupedReservations;

        //console.log("STORE RESERVATIONS AFTER GROUPING:", user.reservations);

        owner = true;
	}

    // get order history for user
    if (user && !storeAdmin) {
        const reservations = await getLastReservations(userId);
        //console.log("USER RESERVATIONS:", reservations);
        const groupedReservations = {};
        // group reservations by basket id and store name
        reservations.forEach(item => {
            if (!groupedReservations[item.basket_id]) {
                groupedReservations[item.basket_id] = {};
            }

            if (!groupedReservations[item.basket_id][item.store_name]) {
                groupedReservations[item.basket_id][item.store_name] = [];
            }

            groupedReservations[item.basket_id][item.store_name].push(item);
        });
        user.reservations = groupedReservations;
        //console.log("USER RESERVATIONS AFTER GROUPING:", user.reservations);
    }
	
	//console.log("Grouped Reservations:", user.reservations);
	res.render("pages/profile", {title: `${user.username}'s Profile`, user: user || false, pageUser: user, owner: owner, storeAdmin: storeAdmin });

});

app.get('/store/:storeId', async (req, res) => {
    const user = req.session.user || false;
    let storeAdmincheck = await isStoreAdmin(user?.user_id) || false;
    let storeAdmin;
    console.log("STORE User:", user);

    if (storeAdmincheck) {
        storeAdmin = await getStoreUsersByUserId(user.user_id);

        if (storeAdmin[0].store_id !== req.params.storeId) {
            return res.render("pages/storeError", {title: "Store Error", user: req.session.user || false, error: "You do not have permission to access this store.", storeAdmin: storeAdmin})
        }
    }

	// // Only allow users to view stores which they have items in their basket from
	// if(basket.length > 0 && basket[0].store_id !== req.params.storeId){
	// 	return res.render("pages/storeError", {title: "Store Error", user: req.session.user || false, error: "You must checkout or remove items from your basket before visiting another store"})
	// }

	// get Store and items info
	const store = await getStoreById(req.params.storeId);
	const items = await getItemsByStoreId(req.params.storeId);
    console.log("items:", items);
    console.log("STOREid:", req.params.storeId);
	// const storeUserId = (await getStoreUsers(store.store_id));
	const sessionUserId = req.session?.user?.user_id;


	res.render("pages/store", {title: `${store.name}`, user: req.session.user || false, items: items, baseUrl: req.baseUrl, store: store, storeAdmin: storeAdmin, itemAdditionals: true});

});

app.get('/store/:storeId/createItem', async (req, res) => {
	const error = false;
	const storeId = req.params.storeId;

    const user = req.session.user || false;
    let storeAdmin = await isStoreAdmin(user?.user_id) || false;

	const store = await getStoreById(storeId);
	const storeUserId = (await getStoreUsers(store.store_id));

    //only allow store admins to access this page
    if (!storeAdmin) {
        return res.render("pages/storeError", {title: "Store Error", user: req.session.user || false, error: "Only store admins can access this page.", storeAdmin: storeAdmin})
    }

	const item = null;

	const sessionUserId = req.session?.user?.user_id;
	const owner = storeUserId.some(storeUsers => storeUsers.user_id === sessionUserId);
	if (!owner) {
		return  res.render("pages/storeError", {title: "Store Error", user: req.session.user || false, error: "You do not have permission to access this page."})
	}

	const title = `Create Item - ${store.name}`;
	res.render("pages/createEditItem", {title: title, user: req.session.user || false, store: store, error: error, item: item, type: "Create", storeAdmin: storeAdmin});
});

app.get('/store/:storeId/editItem/:itemId', async (req, res) => {
	const error = false;
	const storeId = req.params.storeId;
	const itemId = req.params.itemId;

    const user = req.session.user || false;
    let storeAdmin = await isStoreAdmin(user?.user_id) || false;

    //only allow store admins to access this page
    if (!storeAdmin) {
        return res.render("pages/storeError", {title: "Store Error", user: req.session.user || false, error: "Only store admins can access this page.", storeAdmin: storeAdmin})
    }

	const store = await getStoreById(storeId);
	const storeUserId = (await getStoreUsers(store.store_id));
	const item = await getItemByItemId(itemId);

	const sessionUserId = req.session?.user?.user_id;
	const owner = storeUserId.some(storeUsers => storeUsers.user_id === sessionUserId);
	if (!owner) {
		return  res.render("pages/storeError", {title: "Store Error", user: req.session.user || false, error: "You do not have permission to access this page.", storeAdmin: storeAdmin})
	}

	const title = `Edit Item - ${store.name}`;
	res.render("pages/createEditItem", {title: title, user: req.session.user || false, store: store, error: error, item: item, type: "Edit", storeAdmin: storeAdmin})
});

// Items
app.get('/items', async (req, res) => {
	const user = req.session.user || false;
    let storeAdmin = false;

    if (user) {
        storeAdmin = await isStoreAdmin(user?.user_id) || false;
    }

    if (storeAdmin) {
        return res.render("pages/storeError", {title: "Store Error", user: req.session.user || false, error: "Store admins cannot access this page.", storeAdmin: storeAdmin})
    }

	const stores = await getStores();
	
	const items = await getAllItems();
	//console.log("ALL ITEMS:", items);
	res.render("pages/allItems", { title: "Items", items: items, user: user, storeAdmin: storeAdmin, baseUrl: req.baseUrl, stores: stores, itemAdditionals: false});
});

app.get('/store-items', async (req, res) => {
    const user = req.session.user || false;
    let storeAdmin = await isStoreAdmin(user?.user_id) || false;
    //console.log("STORE ADMIN:", storeAdmin);
    // only allow store admins to access this page
    if (!storeAdmin) {
        return res.render("pages/storeError", {title: "Store Error", user: req.session.user || false, error: "Only store admins can access this page.", storeAdmin: storeAdmin})
    }

    storeAdmin = await getStoreUsersByUserId(user.user_id);

    console.log("STORE ADMIN USER:", storeAdmin[0].store_id);
    const storeItems = null;

    res.render("pages/storeItemList", { title: "Your Store Items", items: storeItems, user: user, storeAdmin: storeAdmin, baseUrl: req.baseUrl, itemAdditionals: true});
});

app.get('/allItems', async (req, res) => {
    const user = req.session.user || false;
    let storeAdmin = false;

    res.render("pages/allItems", { title: "All Items", user: user, storeAdmin: storeAdmin, baseUrl: req.baseUrl, stores: await getStores(), itemAdditionals: false});
});


app.get('/logout', (req, res) => {
	req.session.destroy((err) => {
		if (err) {
			return console.log(err);
		}
		res.redirect('/');
	});
});

// BASKET and ORDER routes
app.get('/basket', async (req, res) => {
	const user = req.session.user || false;

    // only allow logged in users who are not store admins to access this page
    if (!user) {
        return res.render("pages/storeError", {title: "Store Error", user: req.session.user || false, error: "You must be logged in to view your basket.", storeAdmin: false})
    }

    const storeAdmin = await isStoreAdmin(user?.user_id) || false;

    if (storeAdmin) {
        return res.render("pages/storeError", {title: "Store Error", user: req.session.user || false, error: "Store admins cannot have a basket.", storeAdmin: storeAdmin})
    }

	const userBasket = await getUserBasket(user.user_id);
	//console.log("USER BASKET:", userBasket);

    const basketTotal = await getBasketTotal(user.user_id);

	console.log("userBasket: ", userBasket)

	res.render("pages/basket", { title: "Your Basket", user: user, basket: userBasket, basketTotal: basketTotal , storeAdmin: storeAdmin});
});

app.get('/checkout', async (req, res) => {
	const user = req.session.user || false;
	const userBasket = await getUserBasket(req.session.user.user_id);
	const error = false;

	res.render("pages/checkout", { title: "Checkout", user: user, basket: userBasket, basketTotal: req.session.basketTotal || 0, error: error, storeAdmin: storeAdmin });
});


// POST routes
// User Routes
app.post('/login', async (req, res) => {

	let { username, password } = req.body;
	username = username.trim();
	password = password.trim();

	// get user from database and verify password
	try {
		const {user, result} = await verifyUserLogin(username, password)
		if (!result) {
			res.render("pages/login", {title: "Login", user: req.session.user || false, error: "Invalid username or password", storeAdmin: false})
		}else{
			req.session.user = user;
			res.redirect('/');
		}

	} catch (error) {
		console.log(error)
		res.render("pages/login", {title: "Login", user: req.session.user, error: error, storeAdmin: false})
	}
});

app.post('/signup', async (req, res) => {
	let { email, username, password } = req.body;
	email = email.trim();
	username = username.trim();
	password = password.trim();

	// create user in database
	try {
		await registerUser(email, username, password);
		req.session.user = await getUserByUsername(username);
		res.redirect('/');

	} catch (error) {
		console.log(error)
		res.render("pages/signup", {title: "Signup", user: req.session.user || false, error: error, storeAdmin: false})
	}
});

//Store Routes
app.post('/registerstore', async (req, res) => {
	// inputs
	let storeName = req.body["store-name"]
	let { email, username, password } = req.body;
	let address = req.body["address"];
	let postcode = req.body["postcode"];
	let file = req.body["file"];
	let description = req.body["description"];
	// opening hours
	let mondayOpen
	let mondayClosed
	console.log("open: ", req.body["monday-open"])
	console.log("closed: ", req.body["monday-closed"])
	console.log("allday: ", req.body["alldaymonday"])
	if (req.body["monday-open"] && req.body["monday-closed"]) {
		mondayOpen = req.body["monday-open"];
		mondayClosed = req.body["monday-closed"];	
	}else{
		mondayOpen = "00:00";
		mondayClosed = "23:59";
	}

	let tuesdayOpen 
	let tuesdayClosed
	if (req.body["tuesday-open"] && req.body["tuesday-closed"]) {
		tuesdayOpen = req.body["tuesday-open"];
		tuesdayClosed = req.body["tuesday-closed"];	
	}else{
		tuesdayOpen = "00:00";
		tuesdayClosed = "23:59";
	}

	let wednesdayOpen 
	let wednesdayClosed 
	if (req.body["wednesday-open"] && req.body["wednesday-closed"]) {
		wednesdayOpen = req.body["wednesday-open"];
		wednesdayClosed = req.body["wednesday-closed"];	
	}else{
		wednesdayOpen = "00:00";
		wednesdayClosed = "23:59";
	}

	let thursdayOpen
	let thursdayClosed 
	if (req.body["thursday-open"] && req.body["thursday-closed"]) {
		thursdayOpen = req.body["thursday-open"];
		thursdayClosed = req.body["thursday-closed"];	
	}else{
		thursdayOpen = "00:00";
		thursdayClosed = "23:59";
	}

	let fridayOpen 
	let fridayClosed 
	if (req.body["friday-open"] && req.body["friday-closed"]) {
		fridayOpen = req.body["friday-open"];
		fridayClosed = req.body["friday-closed"];	
	}else{
		fridayOpen = "00:00";
		fridayClosed = "23:59";
	}

	let saturdayOpen
	let saturdayClosed
	if (req.body["saturday-open"] && req.body["saturday-closed"]) {
		saturdayOpen = req.body["saturday-open"];
		saturdayClosed = req.body["saturday-closed"];	
	}else{
		saturdayOpen = "00:00";
		saturdayClosed = "23:59";
	}

	let sundayOpen 
	let sundayClosed 
	if (req.body["sunday-open"] && req.body["sunday-closed"]) {
		sundayOpen = req.body["sunday-open"];
		sundayClosed = req.body["sunday-closed"];	
	}else{
		sundayOpen = "00:00";
		sundayClosed = "23:59";
	}

	// trim inputs
	storeName = storeName.trim();
	email = email.trim();
	username = username.trim();
	password = password.trim();
	address = address.trim();
	postcode = postcode.trim();

	// convert opening and closing times to json format
	let openingHours = {
		"monday": { "open": mondayOpen, "closed": mondayClosed },
		"tuesday": { "open": tuesdayOpen, "closed": tuesdayClosed },
		"wednesday": { "open": wednesdayOpen, "closed": wednesdayClosed },
		"thursday": { "open": thursdayOpen, "closed": thursdayClosed },
		"friday": { "open": fridayOpen, "closed": fridayClosed },
		"saturday": { "open": saturdayOpen, "closed": saturdayClosed },
		"sunday": { "open": sundayOpen, "closed": sundayClosed }
	};

    console.log("STORE NAME VALUE:", storeName);
    console.log("GetTING STORE BY NAME:", await getStoreByName(storeName));

	// create user and store in database
	try {
		if (await getStoreByName(storeName)) {
			return res.render("pages/registerstore", {title: "Register Store", user: req.session.user || false, error: "Store name already exists", storeAdmin: false})
		}
        if (await getUserByUsername(username)) {
            return res.render("pages/registerstore", {title: "Register Store", user: req.session.user || false, error: "Username already exists", storeAdmin: false})
        }
		const store = await createStore(storeName, address, postcode, JSON.stringify(openingHours), description);
		await registerUser(email, username, password);

		await linkStoreToUser(store.store_id, username);
		req.session.user = await getUserByUsername(username);
		res.redirect('/');

	} catch (error) {
		console.log(error)
		res.render("pages/registerstore", {title: "Register Store", user: req.session.user || false, error: error.message, storeAdmin: false})
	}
});

app.post('/store/:storeId/createItem', async (req, res) => {
	// inputs
	let storeId = req.params.storeId;
	let itemName = req.body["itemname"].trim();
	let price = req.body["price"].trim();
	let file = req.body["file"] || null;
	let nutrition = {
		fats: req.body["fats"].trim(),
        saturates: req.body["saturates"].trim(),
		sugars: req.body["sugars"].trim(),
		salt: req.body["salt"].trim(),
		proteins: req.body["protein"].trim()
	};
    let quantity = req.body["quantity"].trim();
	
	// create item in database
	try {
		await createItem(storeId, itemName, nutrition, price, file, parseFloat(quantity));
		return res.redirect(`/store/${storeId}`);

	} catch (error) {
		console.log(error)
		const store = await getStoreById(storeId);
		res.render("pages/createEditItem", {title: `Create Item - ${store.name}`, user: req.session.user || false, store: store, error: error.message})
	}
});

app.post('/store/:storeId/editItem/:itemId', async (req, res) => {
	// inputs
	let storeId = req.params.storeId;
	let itemId = req.params.itemId;
	let itemName = req.body["itemname"].trim();
	let price = req.body["price"].trim();
	let file = req.body["file"] || null;
	let nutrition = {
		fats: req.body["fats"].trim(),
        saturates: req.body["saturates"].trim(),
		sugars: req.body["sugars"].trim(),
		salt: req.body["salt"].trim(),
		proteins: req.body["protein"].trim()
	};
    let quantity = req.body["quantity"].trim();
	
	// edit item in database
	try {
		await updateItem(itemId, itemName, nutrition, price, file, parseFloat(quantity));
		return res.redirect(`/store/${storeId}`);
	} catch (error) {
		console.log(error)
		const store = await getStoreById(storeId);
		res.render("pages/createEditItem", {title: `Create Item - ${store.name}`, user: req.session.user || false, store: store, error: error.message})
	}
});

app.post('/orderItems/:itemid', async (req, res) => {
    const user = req.session.user || false;
    const storeAdmin =  await isStoreAdmin(user?.user_id) || false;

    if (storeAdmin) {
        return res.render("pages/storeError", {title: "Store Error", user: req.session.user || false, error: "Store admins cannot place orders.", storeAdmin: storeAdmin})
    }
	// process order from basket in session
	const basket = req.session.basket || {};
	console.log("BASKET TO ORDER:", basket);
	// clear basket after ordering
	req.session.basket = {};
	res.redirect('/');
});



// basket and order routes
app.post('/reserveItem/:itemId', async (req, res) => {
    const user = req.session.user || false;
    const storeAdmin =  await isStoreAdmin(user?.user_id) || false;

    if (storeAdmin) {
        return res.render("pages/storeError", {title: "Store Error", user: req.session.user || false, error: "Store admins cannot reserve items.", storeAdmin: storeAdmin})
    }

	const itemId = req.params.itemId;
	const quantity = req.body.itemQuantity || 1;

	// get user basket from db
	const userBasket = await getUserBasket(req.session.user.user_id);
    console.log("USER BASKET:", userBasket);

	const userBasketItems = userBasket.length > 0 ? await getBasketItems(userBasket[0].basket_id) : [];
    console.log("USER BASKET ITEMS:", userBasketItems);

	if (userBasket.length < 1) {
		await createBasket(req.session.user.user_id);
	}

	console.log("USER BASKET:", userBasket);

	// find item in db
	const productItem = await getItemByItemId(itemId);

    //check quantity of item in db
    if (productItem.quantity < quantity) {
        return res.render("pages/storeError", {title: "Store Error", user: req.session.user || false, error: "Not enough items in stock.", storeAdmin: false})
    }

	// check if item already in basket and update quantity if it is, otherwise add item to basket
	if (userBasket.length > 0 && userBasketItems.some(item => item.item_id === itemId)) {
		const existingQuantity = userBasketItems.find(item => item.item_id === itemId).quantity;
		const newQuantity = existingQuantity + quantity;
		await updateBasketItemQuantity(userBasket[0].basket_id, itemId, newQuantity);
	} else {
		// add item to basket
		await addItemToBasket(userBasket[0].basket_id, itemId, quantity);
	}

	// req.session.basketTotal = req.session.basket.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
	const redirectTo = req.get('referer') || `/store/${productItem.store_id}`;
	res.redirect(redirectTo);
});

app.post('/:basketId/removeItemFromBasket/:itemId', async (req, res) => {
	const itemId = req.params.itemId;
    const basketId = req.params.basketId;
	
	// find item in user Basket
	const basket = await getUserBasket(req.session.user.user_id);
	if (basket.length < 1) {
		return res.redirect('/basket');
	}

	const itemInBasket = basket.find(basketItem => basketItem.item_id === itemId);

    if (!itemInBasket) {
        return res.redirect('/basket');
    }
	
	// decrease quantity of item in users basket however if quantity is 0 remove item from basket
	if (itemInBasket.quantity !== -1) {

		if (itemInBasket.quantity - 1 <= 0) {
			await removeItemFromBasket(itemInBasket.basket_id, itemId);
		} else {
			await updateBasketItemQuantity(itemInBasket.basket_id, itemId, itemInBasket.quantity - 1);
		}
	}

	// req.session.basketTotal = req.session.basket.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);

	res.redirect('/basket');
});

app.post('/reserve/:basketId', async (req, res) => {
	const basketId = req.params.basketId;
    const user = req.session.user || false;
    const storeAdmin =  await isStoreAdmin(user?.user_id) || false;

    if (storeAdmin) {
        return res.render("pages/storeError", {title: "Store Error", user: req.session.user || false, error: "Store admins cannot place orders.", storeAdmin: storeAdmin})
    }
	

	if (req.session.user == null) {
		return res.render("pages/checkout", { title: "Checkout", user: req.session.user || false, basket: null || {}, error: "You must be logged in to checkout.", storeAdmin: false })
	}

	// check user owns basket
    const userBasket = await getUserBasket(req.session.user.user_id);
    if (userBasket.length < 1 || userBasket[0].basket_id != basketId) {
        return res.render("pages/checkout", { title: "Checkout", user: req.session.user || false, basket: null || {}, error: "You do not have permission to checkout this basket.", storeAdmin: false })
    }

    // check that the items in the basket have not gone out of stock since being added to the basket
    for (let i = 0; i < userBasket.length; i++) {
        const item = await getItemByItemId(userBasket[i].item_id);
        if (item.quantity < userBasket[i].quantity) {
            return res.render("pages/checkout", { title: "Checkout", user: req.session.user || false, basket: null, error: `Not enough ${item.name} in stock to fulfill your order. Please adjust your basket before checking out.`, storeAdmin: false })
        }
    }

	try {
        // process reservation in database
		await processReservation(basketId);

        // calculate new item quantities 
        for (let i = 0; i < userBasket.length; i++) {
            const item = await getItemByItemId(userBasket[i].item_id);
            const newQuantity = item.quantity - userBasket[i].quantity;
            await updateItem(item.item_id, undefined, undefined, undefined, undefined, newQuantity);
        }

        // create new basket for user after successful reservation
        await createBasket(req.session.user.user_id);

		return res.redirect("/")
	} catch (error) {
		return res.render("pages/checkout", { title: "Checkout", user: req.session.user || false, basket: userBasket, error: error.message, storeAdmin: false })
	}
});


// fetch for items without refreshing page
app.get('/api/items', async (req, res) => {
	const query = req.query || null;
	const fat = query.fat || undefined;
    const saturates = query.saturates || undefined;
	const sugar = query.sugar || undefined;
    const salt = query.salt || undefined;
	const protein = query.protein || undefined;
	const storeId = query.store || undefined;

    console.log("Items fetch");

	console.log("QUERY:", query);
	const items = await getItemByFilter(fat, saturates, sugar, salt, protein, storeId, true);
	//console.log("FILTERED ITEMS:", items);
	if (items.length < 1) {
		return res.json({ error: "No items found matching filter criteria." });
	}
	res.json(items);
});

app.get('/api/store-items', async (req, res) => {
    const query = req.query || null;
    const fat = query.fat || undefined;
    const saturates = query.saturates || undefined;
    const sugar = query.sugar || undefined;
    const salt = query.salt || undefined;
    const protein = query.protein || undefined;
    const storeId = query.store || undefined;
    console.log("storeId:", storeId);

    console.log("Store Items fetch");
 
    // Only allow store admins to access this endpoint
    const user = req.session.user || false;
    const store = await isStoreAdminForStore(user?.user_id);
    console.log("STORE ADMIN STORE:", store.store_id);
 
    if (store == null) {
        return res.json({ error: "Only store admins can access this endpoint." })
    }
   
    console.log("QUERY:", query);
    const items = await getItemByFilter(fat, saturates, sugar,  salt, protein, store.store_id);
    //console.log("FILTERED ITEMS:", items);
    if (items.length < 1) {
        return res.json({ error: "No items found matching filter criteria." });
    }
    res.json(items);
});
 




// Start Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});