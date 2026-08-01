const fs = require("fs");
const path = require("path");

const CACHE_FILE = path.join(
    __dirname,
    "..",
    "cache",
    "cache.json"
);

if (!fs.existsSync(CACHE_FILE)) {
    fs.writeFileSync(CACHE_FILE, "{}");
}

function readCache() {
    return JSON.parse(
        fs.readFileSync(CACHE_FILE, "utf8")
    );
}

function saveCache(cache) {
    fs.writeFileSync(
        CACHE_FILE,
        JSON.stringify(cache, null, 4)
    );
}

function get(username) {

    const cache = readCache();

    return cache[username] || null;

}

function set(username, data) {

    const cache = readCache();

    cache[username] = data;

    saveCache(cache);

}

module.exports = {
    get,
    set
};