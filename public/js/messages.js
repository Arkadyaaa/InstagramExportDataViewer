let currentFolder = "inbox";
let currentChat = null;

function initializeMessages(folder = "inbox") {
	currentFolder = folder;

	const title = document.getElementById("chatListTitle");

	if (title) {
		title.textContent = folder === "inbox" ? "Inbox" : "Message Requests";
	}

	loadChatList(folder);
}

async function loadChatList(folder) {
	currentFolder = folder;

	const response = await fetch(`/api/messages/${folder}`);
	const chats = await response.json();

	const list = document.getElementById("chatItems");

	if (!list) return;

	list.innerHTML = "";

	if (chats.length === 0) {
		list.innerHTML = "<p>No conversations found.</p>";
		return;
	}

	chats.forEach((chat) => {
		const button = document.createElement("button");

		button.className = "chatItem";
		button.textContent = chat.title;

		button.onclick = () => {
			list.querySelectorAll(".chatItem").forEach((b) =>
				b.classList.remove("selected"),
			);

			button.classList.add("selected");

			loadChat(folder, chat.id, chat.title);
		};

		list.appendChild(button);
	});
}

async function loadChat(folder, chatId, chatTitle) {
	currentChat = chatId;

	const response = await fetch(`/api/messages/${folder}/${chatId}`);
	const messages = await response.json();

	// Includes username in chat. Removed as this method is unreliable sometimes result in wrong username for the user
	// const title = chatTitle ?? chatId;
	// const username = await getUsernameByName(title);

	// document.getElementById("chatTitle").innerHTML = `
	//     ${title}
	//     ${username ? `<span class="chatUsername">@${username}</span>` : ""}
	// `;

	document.getElementById("chatTitle").textContent = chatTitle ?? chatId;
	
	document.getElementById("folderName").textContent = "/messages/" + folder + "/" + chatId;
	document.getElementById("folderName").onclick = () => navigator.clipboard.writeText(chatId);

	document.getElementById("messageCount").textContent =
		`${messages.length} Messages`;

	await renderMessages(messages);
}

function getOwnerName() {
	let name = localStorage.getItem("ownerDisplayName");

	if (!name) {
		name = prompt(
			"Enter your Instagram display name exactly as it appears on your own sent messages:",
		);

		if (name) {
			name = name.trim();
			localStorage.setItem("ownerDisplayName", name);
		}
	}

	return name;
}

function isFromOwner(message) {
	const ownerName = getOwnerName();

	if (!ownerName || !message.sender_name) return false;

	return message.sender_name.trim().toLowerCase() === ownerName.toLowerCase();
}

function buildReactionsHtml(reactions) {
	if (!reactions || !reactions.length) return "";

	const grouped = new Map();

	reactions.forEach(({ reaction, actor }) => {
		if (!grouped.has(reaction)) grouped.set(reaction, []);
		grouped.get(reaction).push(actor);
	});

	const pills = [...grouped.entries()]
		.map(([emoji, actors]) => {
			const count = actors.length > 1 ? ` ${actors.length}` : "";
			return `<span class="reactionPill" title="${actors.join(", ")}">${emoji}${count}</span>`;
		})
		.join("");

	return `<div class="messageReactions">${pills}</div>`;
}

async function renderMessages(messages) {
	const container = document.getElementById("messages");

	container.innerHTML = "";

	if (messages.length === 0) {
		container.innerHTML = '<div class="emptyState">No messages.</div>';

		return;
	}

	for (const message of messages) {
		const fromOwner = isFromOwner(message);

		const row = document.createElement("div");
		row.className = "messageRow " + (fromOwner ? "sent" : "received");

		const username = await getUsernameByName(message.sender_name);

		const senderHtml =
			`<div class="messageSender">${message.sender_name ?? ""}` +
			`</div>`;

		const bubble = document.createElement("div");
		bubble.className = "message " + (fromOwner ? "sent" : "received");
		bubble.innerHTML =
			`<div class="messageText">${message.content ?? ""}</div>` +
			buildReactionsHtml(message.reactions);

		const timeHtml = `<div class="messageTime">${new Date(message.timestamp_ms).toLocaleString()}</div>`;

		row.insertAdjacentHTML("beforeend", senderHtml);
		row.appendChild(bubble);
		row.insertAdjacentHTML("beforeend", timeHtml);

		container.appendChild(row);
	}

	container.scrollTop = container.scrollHeight;
}

async function loadMessageSidebar() {
	const list = document.getElementById("messageFiles");

	if (!list) return;

	list.innerHTML = "";

	const items = [
		{
			name: "Inbox",
			folder: "inbox",
		},
		{
			name: "Message Requests",
			folder: "message_requests",
		},
	];

	items.forEach((item) => {
		const button = document.createElement("button");

		button.textContent = item.name;

		button.onclick = async () => {
			list.querySelectorAll("button").forEach((b) =>
				b.classList.remove("selected"),
			);

			button.classList.add("selected");

			await loadScreen("messageScreen");

			initializeMessages(item.folder);
		};

		list.appendChild(button);
	});
}