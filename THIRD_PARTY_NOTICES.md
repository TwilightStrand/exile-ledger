# Third-party notices

Exile Ledger contains no code copied from other extensions. It reads other
tools' export formats and targets the same trade-site pages, and those formats
and page selectors were learned from the projects below.

## Better Trading

https://github.com/exile-center/better-trading, MIT License,
Copyright (c) 2026 Exile Center.

Used for: the folder export and backup string formats (v1 to v3) read by the
importer, and the CSS selectors for trade result rows in `src/trade/selectors.ts`.

## Poe Trade Plus

Published on addons.mozilla.org under the MIT License (version 2.1.1 read).

Used for: its folder string (v4, v5), bookmark document and extension backup
formats, read by the importer.

## TFT Trade Extension

Published on addons.mozilla.org and the Chrome Web Store by The Forbidden
Trove under the MIT License (version 3.0.62 read).

Used for: its folder export codes (current and legacy) read by the importer,
and the trade-site search form selectors in `src/trade/selectors.ts` used by
the keyboard shortcuts.

## Awakened PoE Trade

https://github.com/SnosMe/awakened-poe-trade, MIT License,
Copyright (c) 2020 Alexander Drozdov.

Used for: the shape of the trade API search and fetch responses.

## Data sources

Currency rates come from poe.ninja, only when equivalent prices are switched on.
Path of Exile is a trademark of Grinding Gear Games; this project is not affiliated
with or endorsed by Grinding Gear Games.
