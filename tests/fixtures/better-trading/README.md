Built the way Better Trading (exile-center/better-trading, MIT) serializes folders:
`JSON.stringify` of `{icn, tit, ver?, trs}` then base64, with `2:`/`3:` prefixes for v2/v3
and a `--------------------` line before archived folders in backups.
Replace with real exports when available.
