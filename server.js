const express = require("express");
const path = require("path");

const directories = require("./config/directories");
const exportLoader = require("./services/exportLoader");
const messageLoader = require("./services/messageLoader");

const app = express();

const PORT = 3000;

app.use(express.static("public"));

// Get files from category
app.get("/api/:category/files", (req, res) => {
	const category = req.params.category;

	const directory = directories[category];

	if (!directory) {
		return res.status(404).json({
			error: "Unknown category",
		});
	}

	res.json(exportLoader.getFiles(directory));
});

// Load JSON file
app.get("/api/:category/export/*file", (req, res) => {
	const category = req.params.category;

	const file = req.params.file.join(path.sep);

	const directory = directories[category];

	if (!directory) {
		return res.status(404).json({
			error: "Unknown category",
		});
	}

	const data = exportLoader.readJSON(directory, file);

	if (!data) {
		return res.status(404).json({
			error: "File not found",
		});
	}
	res.json(data);
});

const { getProfilePicture } = require("./services/instagram");

// Get pfp
app.get("/api/profile-picture/:username", async (req, res) => {
	try {
		const file = await getProfilePicture(req.params.username);
		if (!file) {
			return res.sendFile(
				path.join(
					__dirname,
					"public",
					"assets",
					"avatar_placeholder.jpg",
				),
			);
		}
		res.sendFile(file);
	} catch (err) {
		console.error(err);
		res.sendFile(
			path.join(__dirname, "public", "assets", "avatar_placeholder.jpg"),
		);
	}
});

app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});


app.get("/api/messages/folders", (req, res) => {
    res.json([
        { name: "Inbox", folder: "inbox" },
        { name: "Message Requests", folder: "message_requests" }
    ]);
});

// Get Messages (list conversations for a given folder, e.g. "inbox" or "message_requests")
app.get("/api/messages/:folder", (req, res) => {

    res.json(
        messageLoader.getConversationList(
            req.params.folder
        )
    );

});

app.get("/api/messages/:type/:id", (req, res) => {

    const messages =
        messageLoader.getConversation(
            req.params.id,
            req.params.type
        );

    if (!messages)
        return res.sendStatus(404);

    res.json(messages);

});

app.use(
	"/your_instagram_activity",
	express.static(
		path.join(
			__dirname,
			"data",
			"your_instagram_activity"
		)
	)
);