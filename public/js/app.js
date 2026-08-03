async function loadScreen(screen, data = null) {
    const response = await fetch(`/screens/${screen}.html`);
    const html = await response.text();

    document.getElementById("mainContent").innerHTML = html;

    switch (screen) {
        case "connectionsScreen":
            initializeConnections(data);
            break;

        case "messageScreen":
            initializeMessages(data);
            break;

        case "profileChangesScreen":
            initializeProfileChanges(data);
            break;
    }
}