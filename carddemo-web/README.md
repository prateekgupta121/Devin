# CardDemo Web UI (Phase 1 — frontend only)

Modern web replacement for the CardDemo 3270/CICS screens
([aws-mainframe-modernization-carddemo](https://github.com/aws-samples/aws-mainframe-modernization-carddemo)).
All screens run against mock/fixture data derived from the legacy sample data in
`app/data/ASCII/`; there is no backend.

## Run

Requires Node 20.19+ or 22.12+.

```sh
npm install
npm run dev        # http://localhost:5173
npm run lint
npm run build
```

Mock sign-on credentials (from `app/data/ASCII/usrsec.txt`):

| Role    | User id    | Password   |
|---------|------------|------------|
| Admin   | `ADMIN001` | `PASSWORD` |
| Regular | `USER0001` | `PASSWORD` |

## Fixture data

`legacy-data/` holds the legacy ASCII sample files; `npm run gen:fixtures`
parses the fixed-width records (per the `CVACT*Y`/`CVCUS01Y`/`CVTRA*Y` copybooks)
into `src/fixtures/*.json`. The in-browser store seeds from those fixtures and
persists edits in `localStorage` under `carddemo.store.v1` (clear it to reset).

## Screen map

| Legacy tran / program | Route |
|---|---|
| CC00 COSGN00C Sign-on | `/signon` |
| CM00 COMEN01C Main menu | `/menu` |
| CA00 COADM01C Admin menu | `/admin` |
| CAVW COACTVWC Account view | `/accounts/view` |
| CAUP COACTUPC Account update | `/accounts/update` |
| CCLI COCRDLIC Card list | `/cards` |
| CCDL COCRDSLC Card view | `/cards/view` |
| CCUP COCRDUPC Card update | `/cards/update` |
| CT00 COTRN00C Transaction list | `/transactions` |
| CT01 COTRN01C Transaction view | `/transactions/view` |
| CT02 COTRN02C Transaction add | `/transactions/add` |
| CR00 CORPT00C Transaction reports | `/reports` |
| CB00 COBIL00C Bill payment | `/billpay` |
| CU00 COUSR00C User list | `/users` |
| CU01 COUSR01C User add | `/users/add` |
| CU02 COUSR02C User update | `/users/update` |
| CU03 COUSR03C User delete | `/users/delete` |
| CPVS COPAUS0C Pending authorizations (flag) | `/authorizations` |
| CTLI/CTUP Transaction type list/update (flag) | `/trantypes`, `/trantypes/update` |

## Conventions

- **Commarea → URL state.** `user`, `cust`, `acct`, `card`, `tran` and the caller
  stack `from` live in the query string (`src/app/commarea.ts`), so every screen is
  linkable and refresh-safe. F3 pops `from` and returns to the actual caller,
  including its paging state.
- **Keys.** Enter = primary action, F3 = back, F4 = clear, F5 = save/delete/copy,
  F7/F8 = page back/forward, F12 = cancel (`src/app/keys.ts`). Buttons mirror them.
- **Messages.** One message region per screen; legacy wording is preserved
  verbatim in `src/app/messages.ts`. Field-level highlighting is layered on top.
- **Save flow.** Legacy "validate, then F5 to save" is collapsed into Save + confirm
  dialog; the distinct *validated* / *committed* messages are kept.
- **Page sizes.** Defaults are the legacy 7 (cards) and 10 (transactions/users)
  rows, user-overridable via the pager.
- **Reports.** Report requests become mock async jobs (SUBMITTED → RUNNING →
  COMPLETE) listed on the Reports screen with viewable/downloadable output.
- **Feature flags.** `VITE_FEATURE_PENDING_AUTH`, `VITE_FEATURE_TRAN_TYPE`
  (build-time) or `localStorage` `carddemo.flag.*` (runtime), see `src/app/flags.ts`.
