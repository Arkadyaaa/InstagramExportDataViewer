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
		button.dataset.chatId = chat.id;

		button.onclick = () => {
    		selectChatItem(chat.id);
			loadChat(folder, chat.id, chat.title);
		};

		list.appendChild(button);
	});
	

    if (list.querySelector(".chatItem")) {
        list.querySelector(".chatItem").classList.add("selected");

        loadChat(folder, chats[0].id, chats[0].title);
    }
	
	// Search
	const searchInput = document.getElementById("messageSearch");
	const searchBtn = document.getElementById("startSearch");
	const exactMatch = document.getElementById("exactMatch").checked;

	let search = "";

	if (searchInput) {
		searchInput.value = "";
		searchInput.oninput = (e) => {
			search = e.target.value.trim();
		};
	}

	if (searchBtn) {
		searchBtn.onclick = () => {
			if (!search) {
				return;
			}
			searchMessages(search, exactMatch);
		};
	}
}

async function loadChat(folder, chatId, chatTitle, targetMessageId = null) {
	currentChat = chatId;
	document.getElementById("messages").innerHTML = '<div class="emptyState">Loading Conversation...</div>';

	const response = await fetch(`/api/messages/${folder}/${chatId}`);
	const messages = await response.json();

	// Includes username in chat. Removed as this method is unreliable sometimes result in wrong username for the user
	// const title = chatTitle ?? chatId;
	// const username = await getUsernameByName(title);

	// document.getElementById("chatTitle").innerHTML = `
	//     ${title}
	//     ${username ? `<span class="chatUsername">@${username}</span>` : ""}
	// `;

	const chatTitleHTML = document.getElementById("chatTitle");
	document.getElementById("mediaButton").style.display = "block";
	
	const icon = document.createElement("i");
	icon.className = "mdi mdi-folder linkColor";

	chatTitleHTML.textContent = "";
	chatTitleHTML.appendChild(
		document.createTextNode((chatTitle ?? chatId) + " ")
	);
	chatTitleHTML.appendChild(icon);

	chatTitleHTML.onclick = () => {
		navigator.clipboard.writeText(chatId);
		alert("Chat ID copied to clipboard!");
	};

	document.getElementById("messageCount").textContent =
		`${messages.length} Messages`;

	await renderMessages(messages);
	await renderMedia(messages);

	if (targetMessageId !== null) {
		const target = document.querySelector(
			`[data-message-id="${targetMessageId}"]`
		);

		if (target) {
			requestAnimationFrame(() => {
				target.scrollIntoView({
					behavior: "auto",
					block: "center"
				});
			});

			target.classList.add("searchHighlight");

			setTimeout(() => {
				target.classList.remove("searchHighlight");
			}, 2000);
		}
	}
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightTerm(text, query) {
    if (!text) return text;
    try {
        const re = new RegExp(`(${escapeRegExp(query)})`, "ig");
        return text.replace(re, "<mark>$1</mark>");
    } catch (e) {
        return text;
    }
}

async function searchMessages(query, exact) {
	if (!query || !query.trim()) return;

	console.log(`Searching for: "${query}" (Exact match: ${exact})`);

	// replace top bar
	document.getElementById("chatTitle").textContent = "Searching for: " + "\"" + query + "\"";
	document.getElementById("messageCount").textContent = "";
	document.getElementById("mediaButton").style.display = "none";

	document.getElementById("messages").innerHTML = '<div class="emptyState">Searching...</div>';

	// remove selection from chat list
	const list = document.getElementById("chatItems");
    const buttons = list.querySelectorAll(".chatItem");

    buttons.forEach((button) => {
        button.classList.remove("selected");
    });

	// Perform search across all conversations in the current folder
	await searchAllConversations(query, exact);
}

async function searchAllConversations(query, exact) {
	const folder = currentFolder || "inbox";

	// fetch conversation list
	const resp = await fetch(`/api/messages/${folder}`);
	const conversations = await resp.json();

	// fetch all conversations messages in parallel
	const fetches = conversations.map((c) =>
		fetch(`/api/messages/${folder}/${c.id}`).then((r) =>
			r.ok ? r.json().then((msgs) => ({ convo: c, msgs })) : { convo: c, msgs: [] },
		),
	);

	const all = await Promise.all(fetches);

	// Flatten with conversation refs
	const flattened = [];

	for (const item of all) {
		const convo = item.convo;
		const msgs = item.msgs || [];

		for (const m of msgs) {
			const copy = Object.assign({}, m);
			copy._conversationId = convo.id;
			copy._conversationTitle = convo.title ?? convo.id;
			flattened.push(copy);
		}
	}

	const q = query.trim().toLowerCase();

	const filtered = flattened
		.filter((m) => {
			const content = (m.content || "").toLowerCase();

			if(exact) {
				const regex = new RegExp(
					`(?:^|[^\\p{L}\\p{N}_])${escapeRegExp(q)}(?:$|[^\\p{L}\\p{N}_])`,
					"iu"
				);

				return regex.test(content)
			}
			
			return content.includes(q)
		})
		.map((m) => {
			const copy = Object.assign({}, m);
			if (copy.content) copy.content = highlightTerm(copy.content, query);
			return copy;
		});

	renderSearchResults(filtered);
}

async function renderSearchResults(messages) {
	const container = document.getElementById("messages");

	container.innerHTML = "";

	if (!messages || messages.length === 0) {
		container.innerHTML = '<div class="emptyState">No matching messages.</div>';
		return;
	}

	// Show results grouped by conversation
	let currentTitle = "";

	for (const message of messages) {
		const fromOwner = await isFromOwner(message);

		if (currentTitle !== message._conversationTitle) {
			const groupDivider = document.createElement("hr");
			groupDivider.className = "searchConvoGroupDivider";
			container.appendChild(groupDivider);

			const groupTitle = document.createElement("div");
			groupTitle.className = "searchConvoGroupTitle";
			groupTitle.textContent = message._conversationTitle;
			container.appendChild(groupTitle);
		}

		currentTitle = message._conversationTitle;

		const row = document.createElement("div");
		row.className = "messageRow " + (fromOwner ? "sent" : "received") + (message.reactions?.length ? " hasReactions" : "");

		// Sender
		const sender = document.createElement("div");

		sender.className = "messageSender searchedName";

		sender.textContent = (message.sender_name + " " ?? "");

		sender.onclick = () => {
			openSearchedChatMessage(message);
		};

		// Bubble
		const bubbleContainer = document.createElement("div");
		bubbleContainer.className = "bubbleContainer";

		const bubble = document.createElement("div");
		bubble.className = 
			"message search " + 
			(fromOwner ? "sent" : "received");

		bubble.innerHTML = 
			`<div class="messageText"> ${message.content ?? ""} </div>` + 
			buildReactionsHtml(message.reactions);
			
		bubble.onclick = () => {
			openSearchedChatMessage(message);
		};
		
		const openConv = document.createElement("i");
		openConv.className = "mdi mdi-link linkColor";
			
		openConv.onclick = () => {
			openSearchedChatMessage(message);
		};
		
		if(!fromOwner) {
			bubbleContainer.appendChild(bubble);
			bubbleContainer.appendChild(openConv);
		} else {
			bubbleContainer.appendChild(openConv);
			bubbleContainer.appendChild(bubble);
		};

		// Timestamp
		const timeHtml = `<div class="messageTime">${new Date(message.timestamp_ms).toLocaleString()}</div>`;

		row.appendChild(sender);
		row.appendChild(bubbleContainer);
		row.insertAdjacentHTML("beforeend", timeHtml);

		container.appendChild(row);
	}

	container.scrollTop = 0;
}

function openSearchedChatMessage(message) {
	selectChatItem(message._conversationId, true);

	loadChat(
		currentFolder,
		message._conversationId,
		message._conversationTitle,
		message.timestamp_ms
	);
}

function selectChatItem(chatId, scroll = false) {
    const list = document.getElementById("chatItems");

    if (!list) return;

    const buttons = list.querySelectorAll(".chatItem");

    buttons.forEach((button) => {
        button.classList.toggle(
            "selected",
            button.dataset.chatId === chatId
        );

        if (button.dataset.chatId === chatId) {
            selectedButton = button;
        }
    });

    if (scroll && selectedButton) {
        selectedButton.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
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
		row.className = "messageRow " + (fromOwner ? "sent" : "received") + (message.reactions?.length ? " hasReactions" : "");
		row.dataset.messageId = message.timestamp_ms;

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