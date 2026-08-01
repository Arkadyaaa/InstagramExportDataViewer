let currentFolder = "inbox";
let currentChat = null;

function initializeMessages(folder = "inbox") {
	currentFolder = folder;

	const title = document.getElementById("chatListTitle");

	if (title) {
		title.textContent =
			folder === "inbox" ? "Inbox" : "Message Requests";
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
				b.classList.remove("selected")
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

    document.getElementById("chatTitle").textContent = chatTitle ?? chatId;
    document.getElementById("messageCount").textContent =
        `${messages.length} Messages`;

    await renderMessages(messages);
}

async function renderMessages(messages) {
	const container = document.getElementById("messages");

	container.innerHTML = "";

	if (messages.length === 0) {
		container.innerHTML =
			'<div class="emptyState">No messages.</div>';
		return;
	}

	for (const message of messages) {
		const div = document.createElement("div");

		div.className =
			"message " +
			(message.is_from_owner ? "sent" : "received");

		const username = await getUsernameByName(message.sender_name);

		div.innerHTML = `
			<div class="messageSender">
				${message.sender_name ?? ""}
				${username ? `<span class="messageUsername">@${username}</span>` : ""}
			</div>

			<div class="messageText">
				${message.content ?? ""}
			</div>

			<div class="messageTime">
				${new Date(message.timestamp_ms).toLocaleString()}
			</div>
		`;

		container.appendChild(div);
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
				b.classList.remove("selected")
			);

			button.classList.add("selected");

			await loadScreen("messageScreen");

			initializeMessages(item.folder);
		};

		list.appendChild(button);
	});
}