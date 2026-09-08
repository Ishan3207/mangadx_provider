const fs = require("fs");
const path = require("path");

const tsPath = path.join(__dirname, "mangadex.ts");
const manifestPath = path.join(__dirname, "manifest.json");

if (!fs.existsSync(tsPath)) {
    console.error("Error: mangadex.ts not found!");
    process.exit(1);
}

const tsContent = fs.readFileSync(tsPath, "utf8");

let manifest = {};
if (fs.existsSync(manifestPath)) {
    try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    } catch (e) {
        console.warn("Warning: Could not parse existing manifest.json, recreating...");
    }
}

manifest = {
    id: manifest.id || "mangadex-provider",
    name: manifest.name || "MangaDex",
    description: manifest.description || "MangaDex manga provider for Seanime with multi-language and multi-scanlator support",
    manifestURI: manifest.manifestURI || "",
    version: manifest.version || "1.0.1",
    author: manifest.author || "jharn",
    icon: manifest.icon || "https://mangadex.org/favicon.ico",
    website: manifest.website || "https://mangadex.org",
    type: "manga-provider",
    language: "typescript",
    lang: "multi",
    payload: tsContent,
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log("Successfully synced mangadex.ts into manifest.json (version " + manifest.version + ")");
