let currentFolder = "inbox";
let currentChat = null;
let ownerDisplayNames = null;

function initializeMessages(folder = "inbox") {
	currentFolder = folder;

	const title = document.getElementById("chatListTitle");

	if (title) {
		title.textContent = folder === "inbox" ? "Inbox" : "Message Requests";
	}

	const mediaButton = document.getElementById("mediaButton");

	if (mediaButton) {
		mediaButton.onclick = toggleMediaSidebar;
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
	await renderMedia(messages);
}

async function getOwnerName() {

	if (ownerDisplayNames) {
		return ownerDisplayNames;
	}

	const usernames = await getOwnerDisplayNames();

	return usernames;
}

async function isFromOwner(message) {

	if (!message.sender_name)
		return false;

	const names = await getOwnerName();

	return names.has(
		message.sender_name.trim()
	);
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

function buildMessage(message){
	let html = "";

	// Text
	if (message.content) {
		html += `<div class="messageText">${message.content}</div>`;
	}

	// Photos
	if (message.photos?.length) {
		message.photos.forEach((photo) => {
			html += `
				<div class="messagePhoto">
					<img
						src="/${photo.uri}"
						alt="Photo"
						loading="lazy"
    					decoding="async"
            			onclick="openMediaViewer('/${photo.uri}', 'image')"
					>
				</div>
			`;
		});
	}

	// Gifs
	if (message.gifs?.length) {
		message.gifs.forEach((gif) => {
			html += `
				<div class="messageGif">
					<img
						src="/${gif.uri}"
						alt="Photo"
						loading="lazy"
    					decoding="async"
					>
				</div>
			`;
		});
	}

	// Videos
	if (message.videos?.length) {
		message.videos.forEach((video) => {
			html += `
				<div class="messageVideo">
					<a class="messageAttachment">Sent a video</a>
					<video
						preload="metadata"
						muted
						onclick="openMediaViewer('/${video.uri}', 'video')"
					>
						<source src="/${video.uri}">
					</video>
				</div>
			`;
		});
	}

	// Audio
	if (message.audio_files?.length) {
		message.audio_files.forEach((audio) => {
			html += `
				<div class="messageAudio">
					<audio controls preload="none">
						<source src="/${audio.uri}">
						Your browser does not support audio playback.
					</audio>
				</div>
			`;
		});
	}

	// If none of the above, show unavailable
	if (html.length == 0){
		html += `<div class="messageAttachment">Unavailable</div>`;
	}

	// Reactions
	html += buildReactionsHtml(message.reactions);

	return html;
}

async function renderMessages(messages) {
	const container = document.getElementById("messages");

	container.innerHTML = "";

	if (messages.length === 0) {
		container.innerHTML = '<div class="emptyState">No messages.</div>';

		return;
	}

	for (const message of messages) {
		const fromOwner = await isFromOwner(message);

		const row = document.createElement("div");
		row.className = "messageRow " + (fromOwner ? "sent" : "received");

		const username = await getUsernameByName(message.sender_name);

		const senderHtml =
			`<div class="messageSender">${message.sender_name ?? ""}` +
			`</div>`;

		const bubble = document.createElement("div");
		bubble.className = "message " + (fromOwner ? "sent" : "received");
		bubble.innerHTML = buildMessage(message);

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

function openMediaViewer(src, type = "image") {

    const viewer = document.getElementById("mediaViewer");
    const image = document.getElementById("viewerImage");
    const video = document.getElementById("viewerVideo");

    image.style.display = "none";
    video.style.display = "none";

    if (type === "image") {
        image.src = src;
        image.style.display = "block";
    } else {
        video.src = src;
        video.style.display = "block";
        video.load();
        video.play();
    }

    viewer.classList.add("open");
}

function closeMediaViewer() {

    const viewer = document.getElementById("mediaViewer");
    const video = document.getElementById("viewerVideo");

    video.pause();
    video.currentTime = 0;

    viewer.classList.remove("open");
}

function toggleMediaSidebar() {
    document
        .getElementById("mediaSidebar")
        .classList.toggle("open");
}

function renderMedia(messages) {

    const photos = document.getElementById("photoGrid");
    const videos = document.getElementById("videoGrid");

    photos.innerHTML = "";
    videos.innerHTML = "";

    messages.forEach(message => {

        message.photos?.forEach(photo => {

            photos.innerHTML += `
                <img
                    src="/${photo.uri}"
                    onclick="openMediaViewer('/${photo.uri}')"
                >
            `;

        });

        message.videos?.forEach(video => {

            videos.innerHTML += `
                <video
					preload="metadata"
					muted
					onclick="openMediaViewer('/${video.uri}', 'video')"
				>
					<source src="/${video.uri}">
				</video>
            `;

        });

    });

}