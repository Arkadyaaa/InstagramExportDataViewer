let records = [];
let currentFile = "";

function getValue(item, label) {
	if (item.label_values) {
		return item.label_values.find((v) => v.label === label)?.value ?? "";
	}

	if (item.string_list_data?.length) {
		const data = item.string_list_data[0];

		switch (label) {
			case "Username":
				if (data.value) return data.value;

				if (data.href) {
					return data.href
						.split("/")
						.filter(Boolean)
						.pop()
						.replace(/^_u\//, "");
				}

				return "";

			case "Name":
				return item.title ?? "";
		}
	}

	return "";
}

function prettifyJsonName(file) {
	return file
		.replace(".json", "")
		.replace("_1", "")
		.replaceAll("_", " ")
		.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

function render(list) {
	const cards = document.getElementById("cards");

	document.getElementById("count").textContent = `${list.length} Users`;

	cards.innerHTML = "";

	list.forEach((item) => {
		const username = getValue(item, "Username");
		const name = getValue(item, "Name");

		const timestamp =
			item.timestamp ?? item.string_list_data?.[0]?.timestamp ?? 0;

		const date = new Date(timestamp * 1000).toLocaleDateString("en-US", {
			month: "long",
			day: "numeric",
			year: "numeric",
		});

		cards.innerHTML += `
            <div class="card">
                <img
                    class="avatar"
                    src="/api/profile-picture/${username}"
                    onerror="this.src='./assets/avatar_placeholder.jpg'"
                >

                <div class="info">
                    <div class="name">
                        ${name || username}
                    </div>

                    <div class="username">
                        @${username}
                    </div>

                    <div class="date">
                        ${date}
                    </div>

                    <div class="actions">
                        <a href="https://instagram.com/${username}" target="_blank">
                            Instagram
                        </a>

                        <button onclick="navigator.clipboard.writeText('${username}')">
                            Copy Username
                        </button>
                    </div>
                </div>
            </div>
        `;
	});
}

function extractRecords(data) {
	if (Array.isArray(data)) return data;
	if (Array.isArray(data.relationships_following)) return data.relationships_following;
	if (Array.isArray(data.relationships_followers)) return data.relationships_followers;
	return [data];
}

let connectionsUsernameMap = null;

async function buildConnectionsUsernameMap() {
	const map = new Map();

	const filesResponse = await fetch("/api/connections/files");
	const files = await filesResponse.json();

	for (const file of files) {
		const response = await fetch(`/api/connections/export/${file}`);
		const data = await response.json();

		const items = extractRecords(data);

		items.forEach((item) => {
			const name = getValue(item, "Name");
			const username = getValue(item, "Username");

			if (name && username) {
				map.set(name.toLowerCase().trim(), username);
			}
		});
	}

	return map;
}

async function getUsernameByName(name) {
	if (!name) return null;

	if (!connectionsUsernameMap) {
		connectionsUsernameMap = await buildConnectionsUsernameMap();
	}

	return connectionsUsernameMap.get(name.toLowerCase().trim()) ?? null;
}

async function loadExport(file) {
	currentFile = file;

	document.getElementById("currentFile").textContent = prettifyJsonName(file);

	const response = await fetch(`/api/connections/export/${file}`);

	const data = await response.json();

	records = extractRecords(data);

	sortRecords();
}

async function loadSidebar() {
	const response = await fetch("/api/connections/files");
	const files = await response.json();

	const list = document.getElementById("connectionFiles");

	list.innerHTML = "";

	files.forEach((file) => {
		const button = document.createElement("button");

		button.textContent = prettifyJsonName(file);

		button.onclick = () => {
			list.querySelectorAll("button").forEach((b) =>
				b.classList.remove("selected"),
			);

			button.classList.add("selected");

			loadExport(file);
		};

		list.appendChild(button);
	});

	if (files.length) {
		list.firstChild.classList.add("selected");
		loadExport(files[0]);
	}
}

function sortRecords() {
	const mode = document.getElementById("sort").value;

	let sorted = [...records];

	switch (mode) {
		case "newest":
			sorted.sort(
				(a, b) =>
					(b.timestamp ?? b.string_list_data?.[0]?.timestamp ?? 0) -
					(a.timestamp ?? a.string_list_data?.[0]?.timestamp ?? 0),
			);
			break;

		case "oldest":
			sorted.sort(
				(a, b) =>
					(a.timestamp ?? a.string_list_data?.[0]?.timestamp ?? 0) -
					(b.timestamp ?? b.string_list_data?.[0]?.timestamp ?? 0),
			);
			break;

		case "name":
			sorted.sort((a, b) =>
				getValue(a, "Name").localeCompare(getValue(b, "Name")),
			);
			break;

		case "username":
			sorted.sort((a, b) =>
				getValue(a, "Username").localeCompare(getValue(b, "Username")),
			);
			break;
	}

	render(sorted);
}

function initializeConnections() {
	document.getElementById("search").addEventListener("input", (e) => {
		const q = e.target.value.toLowerCase();

		render(
			records.filter((item) => {
				return (
					getValue(item, "Name").toLowerCase().includes(q) ||
					getValue(item, "Username").toLowerCase().includes(q)
				);
			}),
		);
	});

    document
        .getElementById("sort")
        .addEventListener("change", sortRecords);

    loadSidebar();
}