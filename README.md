<p align="center">
  <img src="public/icon/128.png" alt="Exile Ledger" width="96" height="96">
</p>

<h1 align="center">Exile Ledger</h1>

<p align="center">
  <em>Every search you've made, filed and ready.</em>
</p>

<p align="center">
  Bookmarks, search history and price tools for the official Path of Exile trade site.<br>
  PoE1 and PoE2, in Firefox and Chromium browsers, synced through the browser's own sync.
</p>

---

## What's inside

A panel docked beside the trade site, plus a few touches on the result list itself.

| Area              | Included                                                                                |
| ----------------- | --------------------------------------------------------------------------------------- |
| **Bookmarks**     | One-click save, nested folders (five levels), drag and drop, icons, archive, done marks |
| **Leagues**       | Bookmarks reopen in the current league; a folder can be moved to a new league in one go |
| **History**       | Every search per game, kept on each machine, one click to rerun or save                 |
| **Results**       | Searched mods highlighted, listing time, prefix and suffix count, copy item, wiki links |
| **Prices**        | Optional poe.ninja equivalents, divination card stack values                            |
| **Watchers**      | Background checks on listings (sold, back, repriced) and saved searches (new results)   |
| **Search checks** | Warnings for searches that cannot match, such as an uncorrupted level 4 Empower         |
| **Trade site**    | Tab titles, Back and Forward between searches, `~` fuzzy prefix, keyboard shortcuts     |
| **Sharing**       | Share strings per folder, full backup and restore                                       |
| **Imports**       | Better Trading, Poe Trade Plus and TFT exports                                          |
| **Panel**         | Left or right, floats or pushes the page aside, resizable, five themes, compact mode    |
| **Sync**          | Bookmarks and settings through Firefox Sync or your Google account                      |
| **Languages**     | English, Deutsch, Español, 简体中文, Français, Português, Русский, Polski, 한국어       |

## Quick start

```bash
git clone https://github.com/TwilightStrand/exile-ledger.git
cd exile-ledger
pnpm install
pnpm build            # .output/chrome-mv3
pnpm build:firefox    # .output/firefox-mv3
```

- **Chrome, Edge, Brave:** open `chrome://extensions`, turn on Developer mode, click **Load unpacked** and pick `.output/chrome-mv3`.
- **Firefox:** open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on** and pick `.output/firefox-mv3/manifest.json`.

Then open [the PoE1 trade site](https://www.pathofexile.com/trade) or [the PoE2 trade site](https://www.pathofexile.com/trade2) and run a search.

## Development

Requires Node.js 24+ and pnpm.

| Command            | What it does                                                      |
| ------------------ | ----------------------------------------------------------------- |
| `pnpm dev`         | Chromium with hot reload                                          |
| `pnpm dev:firefox` | Firefox with hot reload                                           |
| `pnpm preview:ui`  | The panel and settings page on fixture data, no trade site needed |
| `pnpm test`        | Unit and component tests                                          |
| `pnpm lint`        | Biome                                                             |
| `pnpm typecheck`   | TypeScript                                                        |

## Releases

Every pull request carries a changeset (`changesetter add`). Merges to `main` keep a **Next Release** pull request up to date; merging it bumps the version, writes `CHANGELOG.md`, tags the release, attaches the store zips and submits them to the Chrome Web Store and addons.mozilla.org.

To build the Firefox add-on exactly as submitted, see [BUILDING.md](BUILDING.md).

## Translations

Everything except English was machine translated. If you play in one of these languages, corrections are welcome: the strings live in `src/core/i18n/`, one file per language, and a pull request or an issue quoting the wrong line and the right one both work.

## License

MIT. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the projects whose formats it reads.
