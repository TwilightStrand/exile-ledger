# Exile Ledger

Bookmarks, search history and price tools for the official Path of Exile trade site, for Path of Exile 1 and 2. Runs in Firefox and Chromium browsers, and syncs your bookmarks across machines through the browser's own sync.

## Features

- Save searches into nested folders (five levels), with drag and drop, icons, archive and per-folder share strings.
- Bookmarks open through the stored query in the current league, so they survive a league change.
- Search history per game, kept on each machine.
- Imports from Better Trading and Poe Trade Plus, plus full backup and restore.
- On the result list: highlighted searched mods, pinned items, and optional equivalent prices from poe.ninja.
- Tab titles, a `~` fuzzy prefix in search boxes, and Back/Forward between searches.
- Panel docks left or right, floats or pushes the page aside, and can be resized.

No analytics or tracking. The only site contacted besides the trade site is poe.ninja, and only after you turn on equivalent prices.

## Development

Requires Node.js 24+ and pnpm.

```
pnpm install
pnpm dev            # Chromium with hot reload
pnpm dev:firefox    # Firefox with hot reload
pnpm preview:ui     # the panel and settings page on fixture data, no trade site needed
pnpm test
pnpm lint
pnpm typecheck
pnpm build && pnpm build:firefox
```

## License

MIT. See `THIRD_PARTY_NOTICES.md` for the projects whose formats it reads.
