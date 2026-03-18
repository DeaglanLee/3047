const { getStoreUsersByUserId } = require("./db/stores");

async function isStoreAdmin(userId){
    if (!userId) return false;

    const storeUsers = await getStoreUsersByUserId(userId);
    return storeUsers.length > 0;
}

async function isStoreAdminOfStore(userId) {
    if (!userId) return false;
    const storeUsers = await getStoreUsersByUserId(userId);

    if (storeUsers.length === 0) return null;
    return storeUsers[0];
}

module.exports = {
    isStoreAdmin,
    isStoreAdminOfStore
}