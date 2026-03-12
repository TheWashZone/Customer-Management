# Wash Zone CMS — Documentation

A React + Firebase content management system for a car wash business. Staff use it to look up members, log visits, manage membership records, and view analytics.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React 19, React Router, React Bootstrap |
| Backend/DB | Firebase (Firestore + Auth) |
| Charts | Recharts |
| Excel | ExcelJS |
| Weather | Open-Meteo API (free, no auth) |
| Build | Vite |

---

## Routing

All routes are protected — unauthenticated users are redirected to `/login`. Defined in `App.jsx`.

| Route | Page | Purpose |
|---|---|---|
| `/login` | `LoginPage` | Firebase email/password auth |
| `/` | `CustomerSearchPage` | Keypad to look up and log member visits |
| `/customers` | `CustomerListPage` | Full member list with add/edit/delete |
| `/analytics` | `AnalyticsPage` | Dashboard with tabbed stats and charts |
| `/test` | `UploadPage` | Excel upload and data seeding tools |

---

## Auth Flow

- `App.jsx` subscribes to `onAuthStateChanged` from Firebase.
- The `user` object is passed into `MembersProvider`, which clears all cached data when the user logs out.
- On login, `App.jsx` also triggers a one-per-day cleanup of Firestore visit records older than 1 year (tracked via `localStorage`).

---

## Member Types

The app manages three membership programs, each stored in its own Firestore collection:

| Type | Collection | ID Format | Example |
|---|---|---|---|
| Subscription | `users` | `[B\|D\|U]` + 3–5 digits | `B101`, `D42` |
| Loyalty | `loyaltyMembers` | `L` + 3–5 digits | `L202` |
| Prepaid | `prepaidMembers` | `[B\|D\|U]B` + 3–5 digits | `BB101`, `UB55` |

The first letter of a subscription/prepaid ID encodes the wash tier: **B**asic, **D**eluxe, **U**nlimited.

---

## Docs Index

- [api.md](src/api.md) — Firebase and external API functions
- [pages.md](src/pages.md) — Page-level components and their routes
- [components.md](src/components.md) — Reusable UI components
- [context.md](src/context.md) — MembersContext: global state and caching
- [utils.md](src/utils.md) — Excel upload utility
- [css.md](src/css.md) — CSS files and their scopes
- [firebase-setup.md](firebase-setup.md) — Firebase project setup and emulator config
