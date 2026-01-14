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
	getItemByItemId
} = require("./db/stores");
const {
	processPayment,
} = require("./db/payment")
const {
	getUserByUsername,
	getUserById
} =  require("./db/users");
//const {getItemsByStoreId} = require("./db/items");
const {verifyUserLogin, registerUser} = require("./backend/auth");
const { get } = require('http');

const port = 3000;

app.use("/bootstrap", express.static(__dirname + "/node_modules/bootstrap/dist"))
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
	res.render("pages/login", {title: "Login", user: user});
});

app.get('/signup', (req, res) => {
	const user = req.session.user || false;
	res.render("pages/signup", { title: "Signup", user: user });
});

// Store routes
app.get('/registerstore', (req, res) => {
	const user = req.session.user || false;
	res.render("pages/registerStore", {title: "Register Store", user: user });
});

app.get('/storelogin', (req, res) => {
	const user = req.session.user || false;
	res.render("pages/login", {title: "Store Login", user: user });
});

app.get('/storesignup', (req, res) => {
	const user = req.session.user || false;
	res.render("pages/signup", { title: "Signup", user: user });
});

app.get('/stores', async (req, res) => {
	const user = req.session.user || false;
	const stores = await getStoreList();
	res.render("pages/storelist", { title: "Stores", stores: stores, user: user });
});

app.get('/profile/:userId', async (req, res) => {
	// get user profile info
	const userId = req.params.userId;

	if (userId != req.session.user.user_id) {
		res.redirect('/');
		return;
	}

	const pageUser = await getUserById(userId);
	//const stores = await getStoreByUserId(userId);
	res.render("pages/profile", {title: `${pageUser.username}'s Profile`, user: req.session.user || false, pageUser: pageUser})

});

app.get('/store/:storeId', async (req, res) => {
	const basket = req.session.basket || [];

	// Only allow users to view stores which they have items in their basket from
	if(basket.length > 0 && basket[0].store_id !== req.params.storeId){
		return res.render("pages/storeError", {title: "Store Error", user: req.session.user || false, error: "You must checkout or remove items from your basket before visiting another store"})
	}

	// get Store and items info
	const store = await getStoreById(req.params.storeId);
	const items = await getItemsByStoreId(req.params.storeId);
	const storeUserId = (await getStoreUsers(store.store_id));
	const sessionUserId = req.session?.user?.user_id;

	const owner = storeUserId.some(storeUsers => storeUsers.user_id === sessionUserId);

	res.render("pages/store", {title: `${store.name}`, user: req.session.user || false, items: items, baseUrl: req.baseUrl, owner: owner, store: store})

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
	const basket = req.session.basket || {};

	console.log("Basket: ", basket)

	res.render("pages/basket", { title: "Your Basket", user: user, basket: basket, basketTotal: req.session.basketTotal || 0 });
});

app.get('/checkout', async (req, res) => {
	const user = req.session.user || false;
	const basket = req.session.basket || {};

	res.render("pages/checkout", { title: "Checkout", user: user, basket: basket, basketTotal: req.session.basketTotal || 0 });
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

	// converst opening and closing times to json format
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
		await createStore(storeName, address, postcode, JSON.stringify(openingHours), description);
		await registerUser(email, username, password);

		await linkStoreToUser(storeName, username);
		req.session.user = await getUserByUsername(username);
		res.redirect('/');

	} catch (error) {
		console.log(error)
		res.render("pages/registerstore", {title: "Register Store", user: req.session.user || false, error: error})
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
app.post('/addItemToBasket/:itemId', async (req, res) => {
	const itemId = req.params.itemId;
	const quantity = req.body.itemQuantity || 1;
	if (!req.session.basket) {
		req.session.basket = [];
	}

	// find item in db
	const productItem = await getItemByItemId(itemId);
	const existingItem = req.session.basket.find(item => item.item_id === itemId);

	if (existingItem) {
		existingItem.quantity += parseInt(quantity);
	} else {
		req.session.basket.push({ 
			item_id: productItem.item_id,
			store_id: productItem.store_id,
			name: productItem.name,
			nutrition: productItem.nutrition,
			price: productItem.price,
			picture: productItem.picture, 
			quantity: parseInt(quantity) 
		});
	}

	req.session.basketTotal = req.session.basket.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);

	//req.session.message = "Item added to basket";
	res.redirect('/store/1dec8fb3-77d0-4129-b3d5-2d81b41cfabd');
});

app.post('/removeItemFromBasket/:itemId', async (req, res) => {
	const itemId = req.params.itemId;
	const item = req.session.basket.findIndex(item => item.item_id === itemId);

	// check that if i subtract 1 from the item quantity it is 0 then remove item from basket
	if (item !== -1) {
		req.session.basket[item].quantity -= 1;
		if (req.session.basket[item].quantity <= 0) {
			req.session.basket.splice(item, 1);
		}
	}

	req.session.basketTotal = req.session.basket.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);

	res.redirect('/basket');
});

app.post('/processPayment', async (req, res) => {
	// if (!/^\d{16}$/.test(req.body.cardNumber)) {
	// 	req.session.error = "Card number must be 16 digits."
	// }

	if (req.session.user == null) {
		
	}

	const cardNumber = req.body.cardNumber;
	const nameOnCard = req.body.nameOnCard;
	const expirationDate = req.body.expirationDate;
	const address = req.body.address;
	const postcode = req.body.postcode;


	const basket = req.session.basket;
	const basketTotal = req.session.basketTotal;

	try {
		await processPayment(basket, basketTotal, address, postcode, req.session.user);
		return res.redirect("/")
	} catch (error) {
		
	}
});


// Start Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});