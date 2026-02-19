# TODO

## Nice-to-Have (post-publish)

- [ ] **Add PARTIAL status test**
  - `src/status.js` has three states: ACTIVE, PARTIAL, NOT INSTALLED
  - CI cycle only covers ACTIVE and NOT INSTALLED
  - Should test: script exists but settings not configured (and vice versa)

- [ ] **Add `getOAuthToken()` expiry unit test**
  - Write a temp credentials file with an expired `expiresAt` timestamp
  - Verify the token is skipped and `null` is returned
  - Verify a valid (future) `expiresAt` returns the token correctly

- [ ] **Add GitHub issue templates** (`.github/ISSUE_TEMPLATE/`)
  - Bug report: asks for OS, Node version, Claude Code version, credential source
  - Feature request: problem description, proposed solution

- [ ] **Add CONTRIBUTING.md**
  - "Open an issue before large changes"
  - Branch naming, PR expectations
  - Pointer to CLAUDE.md for architecture
