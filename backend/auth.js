const { getUserByUsername, createUser } = require('../db/users');
const bcrypt = require('bcrypt');


/**
 * Verifies user login credentials
 * 
 * @param {*} username 
 * @param {*} password 
 * @returns true if the username and password match, false otherwise
 */
async function verifyUserLogin(username, password) {
    const user = await getUserByUsername(username);
    if (!user) {
        throw new Error(`User not found`);
    }
    
    return {
        user: user,
        result: await bcrypt.compare(password, user.password)
    }
}

/**
 * Register a new user and store the user in the database
 * 
 * @param {*} email 
 * @param {*} username 
 * @param {*} password 
 */
async function registerUser(email, username, password) {
    const existingUser = await getUserByUsername(username); 
    if (existingUser) {
        throw new Error("Username already exists.");
    }

    // validate password and email
    if (!isPasswordStrong(password)) {
        throw new Error("Password is not strong enough.")
    }

    if (!isEmailValid(email)) {
        throw new Error("Email is not a valid format")
    }

    // hash the password before storing it in the database
    salt = 10;
    password = await bcrypt.hash(password, salt);

    await createUser(email, username, password);   
}


// Helpers

/**
 * Check the password rules
 * 
 * @param {*} password 
 * @returns 
 */
function isPasswordStrong(password){
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialCharacters = /[!@#%^^&*().,?><:;|£$]/.test(password)

    // console.log(password)
    // console.log(password.length >= minLength)
    // console.log(hasUpperCase)
    // console.log(hasLowerCase)
    // console.log(hasNumbers)
    // console.log(hasSpecialCharacters)

    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialCharacters;
}

/**
 * Check the email is a valid format
 * 
 * @param {*} email 
 * @returns 
 */
function isEmailValid(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}


module.exports = {
    verifyUserLogin,
    registerUser
}