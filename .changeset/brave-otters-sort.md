---
exile-ledger: patch
---

#### Imports are safer: a share string or backup with a damaged record imports everything else and says how many records were left out, very long names are shortened instead of dropped, hidden extra data in an import no longer fills sync space, and a search too large to sync is refused with a message when you save it; an older bookmark with such a search is imported without its stored query, opens by its search id, and the import says so. TFT folders that share an id both come through, a malformed TFT code shows a message instead of doing nothing, and the panel says when a change could not be saved, asking for a page reload after an extension update.
