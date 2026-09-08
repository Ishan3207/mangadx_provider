<p align="center">
  <img src="https://mangadex.org/favicon.ico" width="64px" alt="MangaDex Logo" />
</p>

<h1 align="center">MangaDex Provider for Seanime</h1>

<p align="center">
  A full-featured <strong>MangaDex</strong> content provider extension for <a href="https://github.com/5rahim/seanime"><strong>Seanime</strong></a> with multi-language and multi-scanlator support.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Extension_Type-manga--provider-blue?style=for-the-badge" alt="Type" />
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supported_Languages-Multi-success?style=for-the-badge" alt="Multi-Language" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

---

## Features

- **Search with Synonyms**: Full MangaDex title matching (English, Romaji, native titles) with alternate titles mapped as synonyms so Seanime's fuzzy matcher easily pairs entries with AniList.
- **256px Cover Art**: Automatically resolves and displays manga cover thumbnails directly in search results.
- **Multi-Language Support (`supportsMultiLanguage`)**: Full support for all languages indexed by MangaDex. Use Seanime's language filter dropdown to view chapters in English, Spanish, French, Indonesian, Portuguese, etc.
- **Multi-Scanlator Support (`supportsMultiScanlator`)**: Extracts scanlation group names so you can switch between your preferred translation groups.
- **External Chapter Filtering**: Automatically omits external-only redirect chapters (such as MangaPlus or Viz links with 0 hosted pages) so every chapter listed in Seanime can be read directly inside the app.
- **Full Chapter Pagination**: Retrieves up to 10,000 chapters across pagination feeds, numerically sorted in ascending order.
- **Zero-Padded Chapter Titles**: Formats chapters cleanly (e.g. `Chapter 01: Romance Dawn`).
- **MangaDex@Home CDN Resolution**: Resolves page images via MangaDex's distributed CDN network with `forcePort443=true` to prevent firewall blocks.
- **Built-in Image Proxy Integration**: Attaches the appropriate `Referer` header to every chapter page, instructing Seanime to route images through its internal backend image proxy (`/api/v1/image-proxy`) to prevent browser CORS, CSP, and image loading errors in Seanime Denshi / webviews.

---

## How to Install in Seanime

### Method 1: Install via URL (Recommended)

1. Open **Seanime** (or **Seanime Denshi**).
2. Go to **Settings** &rarr; **Extensions**.
3. Click **Install extension** (or **+**).
4. Paste the **raw GitHub URL** of `manifest.json`:

```text
https://raw.githubusercontent.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>/main/manifest.json
```

> [!TIP]
> Once you push this repository to your GitHub account, replace `<YOUR_GITHUB_USERNAME>` and `<YOUR_REPO_NAME>` with your GitHub username and repository name.

5. Click **Install**. Seanime will download, validate, and register MangaDex automatically.

---

### Method 2: Manual Local Installation

If you want to install the provider locally without hosting it on GitHub:

1. Copy [`manifest.json`](manifest.json) to your Seanime `extensions` directory:
   - **Windows**:
     ```powershell
     copy manifest.json "%APPDATA%\Seanime\extensions\mangadex-provider.json"
     ```
     *(Full path: `C:\Users\<YourUsername>\AppData\Roaming\Seanime\extensions\mangadex-provider.json`)*
   - **Linux / Steam Deck**:
     ```bash
     cp manifest.json ~/.config/Seanime/extensions/mangadex-provider.json
     ```
   - **macOS**:
     ```bash
     cp manifest.json ~/Library/Application\ Support/Seanime/extensions/mangadex-provider.json
     ```

2. Restart Seanime (or go to **Settings** &rarr; **Extensions** and click **Reload**).
3. Navigate to **Manga**, open any title, and select **MangaDex** from the provider dropdown!

---

### Method 3: Test in Seanime Extension Playground

1. In Seanime, open **Settings** &rarr; **Extensions** &rarr; **Playground**.
2. Select **Manga Provider**.
3. Copy and paste the entire code from [`mangadex.ts`](mangadex.ts) into the editor.
4. Test any of the provider methods:
   - `search`: `{ "query": "One Piece" }`
   - `findChapters`: `{ "id": "<manga-uuid>" }`
   - `findChapterPages`: `{ "id": "<chapter-uuid>" }`

---

## Repository Structure

```
├── mangadex.ts            # The complete TypeScript Provider implementation
├── manifest.json          # Extension manifest with the TypeScript payload inlined
├── manga-provider.d.ts    # Official Seanime type declarations for IDE support
├── build-manifest.js      # Build script to sync mangadex.ts into manifest.json
├── package.json           # Node project scripts for building and type-checking
├── LICENSE                # MIT License
└── README.md              # Documentation and installation guide
```

---

## Development & Maintenance

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)

### Setup & Type-Checking

1. Clone this repository:
   ```bash
   git clone https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git
   cd <YOUR_REPO_NAME>
   ```

2. Run type-checking on the TypeScript code:
   ```bash
   npx tsc --noEmit --target ES2022 --lib ES2022,DOM mangadex.ts
   ```

### Updating the Extension

Whenever you make changes to [`mangadex.ts`](mangadex.ts):

1. Re-sync the source code into [`manifest.json`](manifest.json):
   ```bash
   npm run build
   # or
   node build-manifest.js
   ```
2. Commit and push your changes to GitHub:
   ```bash
   git add mangadex.ts manifest.json
   git commit -m "Update provider logic"
   git push
   ```

---

## Provider Settings Reference

| Setting | Value | Description |
|---|---|---|
| `supportsMultiLanguage` | `true` | Enables Seanime's language filter dropdown in the reader UI |
| `supportsMultiScanlator` | `true` | Enables scanlation group selection when multiple groups translate the same chapter |

---

## Troubleshooting

<details>
<summary><strong>Images are stuck on the loading spinner</strong></summary>

MangaDex serves chapter images via a distributed community CDN network (`*.mangadex.network`). Seanime handles this by proxying images through its internal backend server (`/api/v1/image-proxy`).
- Ensure you are using the latest version of `manifest.json` (v1.0.1+), which attaches the required `Referer: https://mangadex.org/` header to every page.
- If you previously had cached pages from an older version, clear Seanime's manga page cache in Seanime settings or delete `manga_mangadex-provider_pages_*.cache` in your `%APPDATA%\Seanime\cache\` directory.
</details>

<details>
<summary><strong>"extension ID is already in use" error</strong></summary>

Ensure you do not have both a `mangadex-provider.json` file AND a `mangadex-provider/` folder inside your `%APPDATA%\Seanime\extensions\` directory. Seanime requires only the single `.json` manifest file.
</details>

---

## License

This project is licensed under the [MIT License](LICENSE).
