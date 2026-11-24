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

| Area              | Included                                                                             |
| ----------------- | ------------------------------------------------------------------------------------ |
| **Bookmarks**     | One-click save, nested folders (five levels), drag and drop, icons, archive          |
| **Leagues**       | Bookmarks reopen in the current league, so they outlive the league they were made in |
| **History**       | Every search per game, kept on each machine, one click to rerun or save              |
| **Results**       | Searched mods highlighted, pinned items, optional poe.ninja equivalent prices        |
| **Search checks** | Warnings for searches that cannot match, such as an uncorrupted level 4 Empower      |
| **Trade site**    | Bookmark names in tab titles, Back and Forward between searches, `~` fuzzy prefix    |
| **Sharing**       | Share strings per folder, full backup and restore                                    |
| **Imports**       | Better Trading and Poe Trade Plus, folder strings and full backups                   |
| **Panel**         | Left or right, floats or pushes the page aside, resizable                            |
| **Sync**          | Bookmarks and settings through Firefox Sync or your Google account                   |

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

## License

MIT. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the projects whose formats it reads.
