const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { chromium } = require("playwright");
const cache = require("./cache");

const CACHE_DIR = path.join(__dirname, "..", "cache", "profiles");
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

async function getProfilePicture(username) {

    const filePath = path.join(CACHE_DIR, `${username}.jpg`);

    // Check cache
    const cached = cache.get(username);

    if (cached) {

        if (cached.status === "cached") {
            return cached.path;
        }

        if (cached.status === "failed") {
            return null;
        }

    }

    // Already downloaded
    if (fs.existsSync(filePath)) {
        return filePath;
    }

    // Fetch with Playwright
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(
        `https://www.instagram.com/${username}/`,
        { waitUntil: "networkidle" }
    );

    const imageUrl = await page
        .locator('meta[property="og:image"]')
        .getAttribute("content");

    await browser.close();

    if (!imageUrl) {
        cache.set(username, {
            status: "failed"
        });

        return null;
    }

    // Download image
    const response = await axios({
        url: imageUrl,
        responseType: "stream"
    });

    await new Promise((resolve, reject) => {

        const writer = fs.createWriteStream(filePath);

        response.data.pipe(writer);

        writer.on("finish", resolve);
        writer.on("error", reject);

    });

    cache.set(username, {
        status: "cached",
        path: filePath
    });

    return filePath;
}

module.exports = {
    getProfilePicture
};