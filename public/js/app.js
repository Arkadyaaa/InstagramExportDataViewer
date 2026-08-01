async function loadScreen(screen) {
    const response = await fetch(`/screens/${screen}.html`);
    const html = await response.text();

    document.getElementById("mainContent").innerHTML = html;

    switch (screen) {
        case "connectionsScreen":
            initializeConnections();
            break;

        case "messageScreen":
            break;

        case "postsScreen":
            initializePosts();
            break;
    }
}