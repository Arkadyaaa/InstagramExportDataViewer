const fs = require("fs");
const path = require("path");
const { fixUnicode } = require("./fixUnicode.js");

const DATA_DIR = path.join(
	__dirname,
	"..",
	"data",
	"your_instagram_activity",
	"messages",
);

function readJson(file) {
	return fixUnicode(JSON.parse(fs.readFileSync(file, "utf8")));
}

function getConversationList(type = "inbox") {
	const folder = path.join(DATA_DIR, type);

	if (!fs.existsSync(folder)) return [];

	const conversations = [];

	for (const dir of fs.readdirSync(folder)) {
		const conversationDir = path.join(folder, dir);

		if (!fs.statSync(conversationDir).isDirectory()) continue;

		const messageFiles = fs
			.readdirSync(conversationDir)
			.filter((file) => /^message_\d+\.json$/i.test(file));

		if (messageFiles.length === 0) continue;

		// Read newest file to get title
		messageFiles.sort().reverse();

		const json = readJson(path.join(conversationDir, messageFiles[0]));

		conversations.push({
			id: dir,

			title: json.title ?? dir.replace(/_\d+$/, ""),

			messageCount: messageFiles.length,

			hasPhotos: fs.existsSync(path.join(conversationDir, "photos")),

			hasVideos: fs.existsSync(path.join(conversationDir, "videos")),

			hasGifs: fs.existsSync(path.join(conversationDir, "gifs")),
		});
	}

	conversations.sort((a, b) => a.title.localeCompare(b.title));

	return conversations;
}

function getConversation(id, type = "inbox") {
	const conversationDir = path.join(DATA_DIR, type, id);

	if (!fs.existsSync(conversationDir)) return null;

	const files = fs
		.readdirSync(conversationDir)
		.filter((file) => /^message_\d+\.json$/i.test(file))
		.sort();

	let messages = [];

	for (const file of files) {
		const json = readJson(path.join(conversationDir, file));

		if (json.messages) messages.push(...json.messages);
	}

	messages.sort((a, b) => a.timestamp_ms - b.timestamp_ms);

	return messages;
}

module.exports = {
	getConversationList,

	getConversation,
};
