# TODO

## High Priority

- [ ] **Add try-catch around stdin JSON.parse** (`scripts/statusline.js:120`)
  - Invalid JSON input causes an uncaught exception crash
  - This script runs on every Claude Code response — must fail gracefully
  - Should output a safe fallback (e.g. blank or minimal status line) instead of crashing

- [ ] **Check fetch response status before parsing** (`scripts/statusline.js:108`)
  - `resp.json()` is called without checking `resp.ok`
  - 401/403/500 responses will produce confusing errors or silent failures
  - Should check `resp.ok` and return `null` on non-2xx status

## Medium Priority

- [ ] **Verify or mark Windows credential access as experimental**
  - `Get-StoredCredential` is not a built-in PowerShell cmdlet — requires the `CredentialManager` module
  - Unclear if Claude Code actually stores credentials this way on Windows
  - Either fix the implementation or add a note in README marking Windows as untested

- [ ] **Verify Linux credential access**
  - `secret-tool` assumes Claude Code uses Secret Service on Linux
  - Needs confirmation that this matches Claude Code's actual credential storage

- [ ] **Consider starting at version `0.9.0` or `1.0.0-rc.1`**
  - Windows and Linux credential access are unverified
  - Semantic versioning: 1.0.0 implies stable across all advertised platforms

## Low Priority

- [ ] **Add output content validation to smoke tests**
  - Current tests only check "did it output 2 lines?"
  - Should verify: model name present, cost format correct, progress bar characters valid
  - Consider adding unit tests for `progressBar()`, `timeRemaining()`, `colorForPct()`

- [ ] **Add platform support disclaimer to README**
  - Something like: "Verified on macOS. Linux and Windows support is experimental."
  - Honest documentation builds user trust

- [ ] **Verify screenshot is up to date**
  - `docs/pic/screenshot.png` should match current output format
  - README example text shows "Claude Opus 4.6" — keep in sync with reality
