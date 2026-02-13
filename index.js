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
	getPreviousOrders
} = require("./db/payment")
const {
	getUserByUsername,
	getUserById, 
	getUserBasket,
	createBasket,
	getBasketItems,
	addItemToBasket,
	removeItemFromBasket,
	updateBasketItemQuantity
} =  require("./db/users");
const {createItem, updateItem, getItemByFilter} = require("./db/items");
const {verifyUserLogin, registerUser} = require("./backend/auth");
const { get } = require('http');
const e = require('express');
const { error } = require('console');

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
app.get('/', (req, res) => {
	const user = req.session.user || false
	//console.log("USER SESSION:", req.session.user);
    res.render("pages/home", { title: "Home", user: user });
});

// User routes
app.get('/login', (req, res) => {
	const user = req.session.user || false;
	const error = false;
	res.render("pages/login", {title: "Login", user: user, error: error});
});

app.get('/signup', (req, res) => {
	const user = req.session.user || false;
	const error = false;
	res.render("pages/signup", { title: "Signup", user: user, error: error });
});

// Store routes
app.get('/registerstore', (req, res) => {
	const user = req.session.user || false;
	const error = false;
	res.render("pages/registerStore", {title: "Register Store", user: user, error: error });
});

app.get('/storelogin', (req, res) => {
	const user = req.session.user || false;
	const error = false;
	res.render("pages/login", {title: "Store Login", user: user, error: error });
});

app.get('/storesignup', (req, res) => {
	const user = req.session.user || false;
	const error = false;
	res.render("pages/signup", { title: "Signup", user: user, error: error });
});

app.get('/stores', async (req, res) => {
	const user = req.session.user || false;
	const stores = await getStoreList();
	res.render("pages/storelist", { title: "Stores", stores: stores, user: user });
});

app.get('/profile/:userId', async (req, res) => {
	// get user profile info
	const userId = req.params.userId;
	let owner = false;


	if (userId != req.session.user?.user_id) {
		return res.redirect('/');
	}

	// get user store info to check ownership of stores
	const pageUser = await getUserById(userId);
	const storeUserId = (await getStoreUsersByUserId(userId));
	if (storeUserId.length > 0) {
		owner = true;
		// get store info
		for (let i = 0; i < storeUserId.length; i++){
			const store = await getStoreById(storeUserId[i].store_id);
			pageUser.stores.push(store);
		}
	}

	// get last orders for user
	const orders = await getPreviousOrders(userId);
	pageUser.orders = orders;
	console.log("Orders:", pageUser.orders);
	res.render("pages/profile", {title: `${pageUser.username}'s Profile`, user: req.session.user || false, pageUser: pageUser, owner: owner  });

});

app.get('/store/:storeId', async (req, res) => {
	const basket = req.session.basket || [];

	// // Only allow users to view stores which they have items in their basket from
	// if(basket.length > 0 && basket[0].store_id !== req.params.storeId){
	// 	return res.render("pages/storeError", {title: "Store Error", user: req.session.user || false, error: "You must checkout or remove items from your basket before visiting another store"})
	// }

	// get Store and items info
	const store = await getStoreById(req.params.storeId);
	const items = await getItemsByStoreId(req.params.storeId);
	const storeUserId = (await getStoreUsers(store.store_id));
	const sessionUserId = req.session?.user?.user_id;

	const owner = storeUserId.some(storeUsers => storeUsers.user_id === sessionUserId);

	res.render("pages/store", {title: `${store.name}`, user: req.session.user || false, items: items, baseUrl: req.baseUrl, owner: owner, store: store})

});

app.get('/store/:storeId/createItem', async (req, res) => {
	const error = false;
	const storeId = req.params.storeId;

	const store = await getStoreById(storeId);
	const storeUserId = (await getStoreUsers(store.store_id));
	const item = null;

	const sessionUserId = req.session?.user?.user_id;
	const owner = storeUserId.some(storeUsers => storeUsers.user_id === sessionUserId);
	if (!owner) {
		return  res.render("pages/storeError", {title: "Store Error", user: req.session.user || false, error: "You do not have permission to access this page."})
	}

	const title = `Create Item - ${store.name}`;
	res.render("pages/createEditItem", {title: title, user: req.session.user || false, store: store, error: error, item: item, type: "Create"});
});

app.get('/store/:storeId/editItem/:itemId', async (req, res) => {
	const error = false;
	const storeId = req.params.storeId;
	const itemId = req.params.itemId;

	const store = await getStoreById(storeId);
	const storeUserId = (await getStoreUsers(store.store_id));
	const item = await getItemByItemId(itemId);

	const sessionUserId = req.session?.user?.user_id;
	const owner = storeUserId.some(storeUsers => storeUsers.user_id === sessionUserId);
	if (!owner) {
		return  res.render("pages/storeError", {title: "Store Error", user: req.session.user || false, error: "You do not have permission to access this page."})
	}

	const title = `Edit Item - ${store.name}`;
	res.render("pages/createEditItem", {title: title, user: req.session.user || false, store: store, error: error, item: item, type: "Edit"})
});

// Items
app.get('/items', async (req, res) => {
	const user = req.session.user || false;

	const stores = await getStores();

	// check if user is owner of any stores
	let isOwner = false;	
	for (const store of stores) {
		const storeUsers = await getStoreUsers(store.store_id);
		if (storeUsers.some(storeUser => storeUser.user_id === user.user_id)) {
			isOwner = true;
			break;
		}
	}
	
	req.session.owner = isOwner;
	const items = await getAllItems();
	console.log("ALL ITEMS:", items[1].updated_at);
	res.render("pages/itemlist", { title: "Items", items: items, user: user, owner: isOwner, baseUrl: req.baseUrl, stores: stores});
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
	const userBasket = await getUserBasket(req.session.user.user_id);
	const basketItems = userBasket.length > 0 ? await getBasketItems(userBasket[0].basket_id) : [];
	console.log("USER BASKET:", userBasket);
	console.log("BASKET ITEMS:", basketItems);

	// console.log("Basket: ", basket)

	res.render("pages/basket", { title: "Your Basket", user: user, basket: userBasket, basketItems: basketItems, basketTotal: req.session.basketTotal || 0 });
});

app.get('/checkout', async (req, res) => {
	const user = req.session.user || false;
	const userBasket = await getUserBasket(req.session.user.user_id);
	const error = false;

	res.render("pages/checkout", { title: "Checkout", user: user, basket: userBasket, basketTotal: req.session.basketTotal || 0, error: error });
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
			res.render("pages/login", {title: "Login", user: req.session.user || false, error: "Invalid username or password"})
		}else{
			req.session.user = user;
			res.redirect('/');
		}

	} catch (error) {
		console.log(error)
		res.render("pages/login", {title: "Login", user: req.session.user, error: error})
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
		req.session.user = username;
		res.redirect('/');

	} catch (error) {
		console.log(error)
		res.render("pages/signup", {title: "Signup", user: req.session.user || false, error: error})
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

	// create user in database
	try {
		if (getStoreByName(storeName)) {
			return res.render("pages/registerstore", {title: "Register Store", user: req.session.user || false, error: "Store name already exists"})
		}
		await createStore(storeName, address, postcode, JSON.stringify(openingHours), description);
		await registerUser(email, username, password);

		await linkStoreToUser(storeName, username);
		req.session.user = await getUserByUsername(username);
		res.redirect('/');

	} catch (error) {
		console.log(error)
		res.render("pages/registerstore", {title: "Register Store", user: req.session.user || false, error: error.message})
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
		sugars: req.body["sugars"].trim(),
		carbs: req.body["carbs"].trim()
	};
	
	// create item in database
	try {
		await createItem(storeId, itemName, nutrition, price, file);
		res.redirect(`/store/${storeId}`);
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
		sugars: req.body["sugars"].trim(),
		carbs: req.body["carbs"].trim()
	};
	
	// create item in database
	try {
		await updateItem(itemId, itemName, nutrition, price, file);
		res.redirect(`/store/${storeId}`);
	} catch (error) {
		console.log(error)
		const store = await getStoreById(storeId);
		res.render("pages/createEditItem", {title: `Create Item - ${store.name}`, user: req.session.user || false, store: store, error: error.message})
	}
});

app.post('/orderItems/:itemid', async (req, res) => {
	// process order from basket in session
	const basket = req.session.basket || {};
	console.log("BASKET TO ORDER:", basket);
	// clear basket after ordering
	req.session.basket = {};
	res.redirect('/');
});



// basket and order routes
app.post('/reserveItem/:itemId', async (req, res) => {
	const itemId = req.params.itemId;
	const quantity = req.body.itemQuantity || 1;

	// get user basket from db
	const userBasket = await getUserBasket(req.session.user.user_id);
	const userBasketItems = userBasket.length > 0 ? await getBasketItems(userBasket[0].basket_id) : [];
	if (userBasket.length < 1) {
		await createBasket(req.session.user.user_id);
	}

	console.log("USER BASKET:", userBasket);

	// find item in db
	const productItem = await getItemByItemId(itemId);

	// check if item already in basket 
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

app.post('/removeItemFromBasket/:itemId', async (req, res) => {
	const itemId = req.params.itemId;
	
	// find item in user Basket
	const basket = getUserBasket(req.session.user.user_id);
	if (basket.length < 1) {
		return res.redirect('/basket');
	}

	let basketItems = await getBasketItems(basket[0].basket_id);
	const itemInBasket = basketItems.find(basketItem => basketItem.item_id === itemId);
	
	// decrease quantity of item in users basket however if quantity is 0 remove item from basket
	if (itemInBasket.quantity !== -1) {
		if (itemInBasket.quantity - 1 <= 0) {
			await removeItemFromBasket(basket[0].basket_id, itemId);
		} else {
			await updateBasketItemQuantity(basket[0].basket_id, itemId, itemInBasket.quantity - 1);
		}
	}

	// req.session.basketTotal = req.session.basket.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);

	res.redirect('/basket');
});

app.post('/processPayment', async (req, res) => {
	// if (!/^\d{16}$/.test(req.body.cardNumber)) {
	// 	req.session.error = "Card number must be 16 digits."
	// }
	const expirationDate = req.body.expirationDate;
	

	if (req.session.user == null) {
		return res.render("pages/checkout", { title: "Checkout", user: req.session.user || false, basket: req.session.basket || {}, basketTotal: req.session.basketTotal || 0, error: "You must be logged in to checkout." })
	}

	if (expirationDate) {
		
	}

	const cardNumber = req.body.cardNumber;
	const nameOnCard = req.body.nameOnCard;
	const address = req.body.address;
	const postcode = req.body.postcode;


	const basket = req.session.basket;
	const basketTotal = req.session.basketTotal;

	try {
		await processPayment(basket, basketTotal, address, postcode, cardNumber, nameOnCard, expirationDate, req.session.user);
		req.session.basket = {};
		req.session.basketTotal = 0;
		return res.redirect("/")
	} catch (error) {
		return res.render("pages/checkout", { title: "Checkout", user: req.session.user || false, basket: basket, basketTotal: basketTotal, error: error.message })
	}
});


// fetch
app.get('/api/items', async (req, res) => {
	const query = req.query || null;
	const fat = query.fat || undefined;
	const sugar = query.sugar || undefined;
	const carbs = query.carbs || undefined;
	const protein = query.protein || undefined;
	const storeId = query.store || undefined;

	console.log("QUERY:", query);
	const items = await getItemByFilter(fat, sugar, carbs, protein, storeId);
	console.log("FILTERED ITEMS:", items);
	if (items.length < 1) {
		return res.json({ error: "No items found matching filter criteria." });
	}
	res.json(items);
});


// Start Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});