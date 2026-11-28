# Changelog

## 0.2.0 - 2026-11-28

#### Watchers

Watch a listing from its Watch button on the trade site, or a saved search with the eye button on a bookmark. Exile Ledger checks them in the background and the new Watch tab shows whether a listing is still up, sold or repriced, and how many new results a search has; opening a search there marks them seen. Optional browser notifications tell you when something changes, and clicking one opens it. Checks use at most half of the trade site's rate limits, so your own searches still have room. The site asks for access once, on the settings page, where you also pick how often checks run. Backups include watchers, and restoring adds them without touching existing ones.

#### Keyboard shortcuts

On the trade site: show or hide the panel, jump to item search, add a stat filter, clear the search, and go to a stat filter's min or max. Change or remove them on the settings page.

#### Nine languages

Exile Ledger now speaks Deutsch, Español, 简体中文, Français, Português, Русский, Polski and 한국어 as well as English. It follows the browser's language by default; pick another on the settings page. The translations are machine-made and corrections are welcome.

#### Look and layout

Pick a theme (dark gold, blood, verdant, azure or bone), turn on compact rows, and set the panel width in percent of the window or in pixels. All under Appearance and Panel in the settings.

#### More on each result

The exact time it was listed, its prefix and suffix count, a Copy item button for Path of Building or paste search, a wiki link, and, with equivalent prices on, the value of a whole divination card stack at poe.ninja's price. An optional PoE1 warning flags items whose item level caps their sockets. Fuzzy ~ for stat filters is now its own setting.

#### Bookmarks

Replace a bookmark with the current search, tick bookmarks off as done one at a time or a whole folder at once, move a folder to another league in one go, and import from TFT Trade Extension (current and older exports) on the settings page.

#### Faster live search

Each new listing is handled once instead of three times, the panel no longer redraws for every result, and collapsed folders cost nothing until opened, so long live searches and large bookmark libraries stay smooth. Dragging the panel edge follows the pointer without lag, and a Pin button on a row the site reused now pins the listing it shows.

#### Safer imports and sync

A damaged record in a backup or share string no longer blocks the rest, and the import says how many it left out. Oversized or hidden data can no longer fill your sync space, and a search too large to sync is refused with a message when you save it. The panel says when a change could not be saved. If another browser syncs with a newer Exile Ledger, sync pauses and asks you to update instead of overwriting. Update every browser you sync to 0.2.0: an older version resets the new settings when it saves.

#### A single search result now reads "1 result" instead of "1 results".
