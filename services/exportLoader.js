const fs = require("fs");
const { fixUnicode } = require("./fixUnicode.js");

function getFiles(directory) {
	if (!fs.existsSync(directory)) {
		return [];
	}

	return fs.readdirSync(directory);
}

function readJSON(directory, file) {
	const filepath = require("path").join(directory, file);

	if (!fs.existsSync(filepath)) {
		return null;
	}

	const data = JSON.parse(fs.readFileSync(filepath, "utf8"));

	return fixUnicode(data);
}

module.exports = {
	getFiles,
	readJSON,
};
