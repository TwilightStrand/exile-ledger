# Privacy policy

Exile Ledger does not collect, sell or share any data. It has no analytics, tracking or servers of its own.

## What it stores

- **Bookmarks and folders** are kept in your browser's extension storage. If bookmark sync is on, they are copied through your browser's own sync (Google account in Chrome, Firefox account in Firefox) to your other machines. Turning bookmark sync off stops further copies but leaves the last synced copy in your browser's sync storage until you clear it there. The developer has no access to any of it.
- **Settings** always go through your browser's own sync, so your other machines get the same panel layout and options.
- **Search history** stays in local extension storage on each machine and is never synced. You can turn it off or clear it in the settings.
- **Pinned results** are held in memory for the current tab and discarded when it closes.
- **Watchers** (the listings and searches you watch, with the item name, the seller's public account name, the last known price, status and result ids) stay in local extension storage on each machine and are never synced. They are included in backup files you save yourself.

## What it reads

On the Path of Exile trade site, the extension reads the search requests and results the page itself makes, to fill in the panel, record history and highlight mods. It does not read cookies or your session.

## Watchers

If you watch a listing or a search and allow access to the trade site, the extension checks them in the background: it repeats the watched search, or fetches the watched listings, through the official trade API, on the schedule you set and within the rate limits GGG publishes. Your browser sends these requests to the trade site the same way it sends the page's own, including your login cookie for that site; the extension never reads that cookie or sends anything to any other place. Without watchers, or without that access, the extension sends no requests to the trade site on its own.

If you turn on notifications and allow them, watcher changes are shown as notifications by your browser. Nothing about them leaves your machine.

## Other sites

If you turn on equivalent prices and grant access, the extension fetches public currency and divination card prices from poe.ninja. Those requests carry the game and league name and nothing about you. Without that setting, the extension contacts no site other than the official trade site.

## Removing your data

Uninstalling the extension removes its local data. Synced data can be removed by deleting your bookmarks in the extension before uninstalling, or by clearing extension data in your browser's sync settings.

## Contact

Questions about this policy go to the issue tracker of the project's repository.
