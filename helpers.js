const { getStoreUsersByUserId } = require("./db/stores");

async function isStoreAdmin(userId){
    if (!userId) return false;

    const storeUsers = await getStoreUsersByUserId(userId);
    return storeUsers.length > 0;
}

module.exports = {
    isStoreAdmin
}