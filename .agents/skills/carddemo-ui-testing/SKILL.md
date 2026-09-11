---
name: carddemo-ui-testing
description: Run and test the fixture-backed CardDemo web UI locally.
---

# Local setup
- Work in the `carddemo-web/` directory at the repo root (introduced by PR #1, branch `devin/1788890847-carddemo-web-ui`; check it out or merge it first if the directory is absent).
- Use Node 22: `source ~/.nvm/nvm.sh && nvm use 22`.
- Install dependencies with `npm install`; run `npx vite --port 5173 --strictPort`.
- Open `http://localhost:5173` and sign on through the UI with fixture credentials `ADMIN001/PASSWORD` or `USER0001/PASSWORD`.

# State and navigation
- App data persists in localStorage `carddemo.store.v1`; clearing it resets fixture changes.
- Authentication is tab-scoped in sessionStorage `carddemo.session.user`. Changing the URL user is not a substitute for signing on. Refresh retains the tab session; new tabs require sign-on.
- Enable Pending Authorization on Main Menu and Transaction Type on Admin Menu via the optional-module checkboxes. Flags are localStorage `carddemo.flag.pendingAuth` and `carddemo.flag.tranType`.
- Authorization fixtures may not exist for the first account. Accounts `00000000050` and `00000000027` contain seeded candidates on clean state; verify pending state before testing.
- Exercise physical function keys as well as buttons. Verify persistence with refresh after confirmation.
- During report recovery testing refresh immediately after submission, then verify transition to COMPLETE and rendered output.

## Devin Secrets Needed
None for the local fixture-backed application.
