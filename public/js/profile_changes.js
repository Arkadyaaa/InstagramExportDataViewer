let profileChanges = [];
let ownerProfileNames = null;

function prettifyJsonName(file) {
    return file
        .replace(".json", "")
        .replace(/_\d+$/, "")
        .replaceAll("_", " ")
        .replace(/(^|\s)\S/g, c => c.toUpperCase());
}

async function loadPersonalInformationSidebar() {

    const response = await fetch("/api/personal_information/files");

    const files = await response.json();

    const list = document.getElementById("personalInformationFiles");

    list.innerHTML = "";

    files.forEach(file => {

        const button = document.createElement("button");

        button.textContent = prettifyJsonName(file);

        button.onclick = () => {

            list.querySelectorAll("button")
                .forEach(b => b.classList.remove("selected"));

            button.classList.add("selected");

            // Load the Profile Changes screen
            loadScreen("profileChangesScreen")
                .then(() => loadProfileChanges(file));

        };

        list.appendChild(button);

    });

}

function renderProfileChanges(list) {

    const container = document.getElementById("changes");

    document.getElementById("count").textContent =
        `${list.length} Changes`;

    container.innerHTML = "";

    list.forEach(item => {

        const data = item.string_map_data;

        const changed =
            data["Changed"]?.value ?? "";

        const previous =
            data["Previous Value"]?.value ?? "—";

        const next =
            data["New Value"]?.value ?? "—";

        const timestamp =
            data["Change Date"]?.timestamp ?? 0;

        const date = new Date(timestamp * 1000)
            .toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric"
            });

        container.innerHTML += `
            <div class="changeCard">

                <div class="changeTitle">
                    ${changed}
                </div>

                <div class="changeRow">
                    Previous:
                    <a class="changeRowText">${previous || "Empty"}</a>
                </div>

                <div class="changeRow">
                    New:
                    <a class="changeRowText">${next || "Empty"}</a>
                </div>

                <div class="changeDate">
                    ${date}
                </div>

            </div>
        `;

    });

}

async function loadProfileChanges(file) {

    console.log(file); 

    const response = await fetch(
        `/api/personal_information/export/${file}`
    );

    const data = await response.json();

    profileChanges = data.profile_profile_change ?? data;

    renderProfileChanges(profileChanges);

}

function initializeProfileChanges(file) {
    loadProfileChanges(file);

    document
        .getElementById("search")
        .addEventListener("input", (e) => {
            const q = e.target.value.toLowerCase();

            renderProfileChanges(
                profileChanges.filter((item) => {
                    const map = item.string_map_data;

                    return (
                        map["Changed"]?.value?.toLowerCase().includes(q) ||
                        map["Previous Value"]?.value?.toLowerCase().includes(q) ||
                        map["New Value"]?.value?.toLowerCase().includes(q)
                    );
                })
            );
        });
}

//--------

async function getOwnerDisplayNames() {
	if (ownerProfileNames) {
		return ownerProfileNames;
	}

	const names = new Set();

	// Current profile name
	const profileResponse = await fetch(
		"/api/personal_information/export/instagram_profile_information.json"
	);

	const profile = await profileResponse.json();

	const currentName =
		profile.profile_user?.[0]?.string_map_data?.["Profile Name"]?.value;

	if (currentName) {
		names.add(currentName.toLowerCase().trim());
	}

	// Previous profile names
	const response = await fetch(
		"/api/personal_information/export/profile_changes.json"
	);

	const data = await response.json();

	const changes = data.profile_profile_change ?? data;

	changes.forEach((change) => {
		const map = change.string_map_data;

		// Only keep profile name changes
		if (map["Changed"]?.value !== "Profile Name") {
			return;
		}

		const previous = map["Previous Value"]?.value?.trim();
		const next = map["New Value"]?.value?.trim();

		if (previous) {
			names.add(previous);
		}

		if (next) {
			names.add(next);
		}
	});

	ownerProfileNames = names;

	return names;
}