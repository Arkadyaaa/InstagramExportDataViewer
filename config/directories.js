const path = require("path");

const DATA_DIR = path.join(
    __dirname,
    "..",
    "data"
);


module.exports = {
    connections: path.join(
        DATA_DIR,
        "connections",
        "followers_and_following"
    ),

    messages: path.join(
        DATA_DIR,
        "your_instagram_activity",
        "messages",
        "inbox"
    ),
};