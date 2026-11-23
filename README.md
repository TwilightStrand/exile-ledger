# Exile Ledger

Bookmarks, search history and price tools for the official Path of Exile trade site, for Path of Exile 1 and 2. Runs in Firefox and Chromium browsers, and syncs your bookmarks across machines through the browser's own sync.

## Development

Requires Node.js 24+ and pnpm.

```
pnpm install
pnpm dev            # Chromium with hot reload
pnpm dev:firefox    # Firefox with hot reload
pnpm test
pnpm lint
pnpm typecheck
pnpm build && pnpm build:firefox
```

## License

MIT
