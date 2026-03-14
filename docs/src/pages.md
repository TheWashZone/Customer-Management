# Pages

Page components live in `cms-app/src/pages/`. Each page is a full-screen route component. All routes (except `/login`) require authentication — unauthenticated users are redirected to `/login` by `App.jsx`.

---

## Files

| File | Route | Component |
|---|---|---|
| `login-page.jsx` | `/login` | `Login` |
| `customer-search-page.jsx` | `/` | `CustomerSearchPage` |
| `customer-list-page.jsx` | `/customers` | `MembersPage` |
| `analytics-page.jsx` | `/analytics` | `AnalyticsPage` |
| `upload-page.jsx` | `/test` | `UploadPage` |

---

## login-page.jsx

The authentication gate. Renders an email/password form backed by `signIn()` from `firebase-auth.js`.

- On success, navigates to `/`.
- Handles `auth/invalid-credential` and `auth/too-many-requests` Firebase errors explicitly with user-facing messages.
- If the user is already authenticated, `App.jsx` redirects away from `/login` before this page renders.

---

## customer-search-page.jsx

The primary operational screen — what staff use at the counter throughout the day.

**Two views:**

1. **Keypad view** — A numpad with letter keys (B, D, U, L) for entering a member ID. Validates the format before enabling submit.
2. **Member details view** — Shown after a valid lookup. Displays member info and provides action buttons.

**ID format rules (enforced by regex):**
- Subscription: `B`, `D`, or `U` + 3–5 digits (e.g., `B123`)
- Loyalty: `L` + 3–5 digits (e.g., `L202`)
- Prepaid: `BB`, `DB`, or `UB` + 3–5 digits (e.g., `BB101`)

**Key behaviors:**
- Determines member type from the ID prefix and calls the appropriate `get*Member` from context.
- **Log Customer** button calls `logDailyVisit()` and, for loyalty/prepaid, also updates the member record (visit count or remaining washes).
- Loyalty members get a **wash type selector popup** before logging (unless it's a free wash on a 10th visit).
- Prepaid members: the button is disabled if `prepaidWashes === 0`.
- A **Log Cash Customer** button opens a wash type modal and logs a cash visit without any member lookup.
- An **Edit Member** popup allows staff to update name, email, notes, status (subscription), visit count (loyalty), or prepaid washes.

---

## customer-list-page.jsx

Admin view for managing all member records. Uses tabs to switch between Subscription, Loyalty, and Prepaid.

**Subscription tab:**
- Filterable table of all subscription members with search by name or ID.
- Add, Edit, Delete member modals.
- Export to Excel (via ExcelJS) — downloads a `.xlsx` with all visible/filtered members.
- Status badge (Active / Inactive / Payment Needed) displayed per row.

**Loyalty tab:**
- Loads lazily on first access (`ensureLoyaltyLoaded`).
- Add, Edit, Delete loyalty members.
- Displays visit count and issue date.

**Prepaid tab:**
- Loads lazily on first access (`ensurePrepaidLoaded`).
- Add, Edit, Delete prepaid members.
- Displays remaining washes.

All member mutations go through `MembersContext` to keep the in-memory cache in sync.

---

## analytics-page.jsx

A tabbed analytics dashboard. Tab selection is managed with a single `activeView` state string; the active tab's component is rendered via a `switch`.

| Tab | Component | Shows |
|---|---|---|
| Subscriptions | `MembershipStats` | Member counts, status breakdown, pie chart by type |
| Loyalty | `LoyaltyStats` | Total members, avg visits, near-free-wash count |
| Prepaid | `PrepaidStats` | Total members, avg washes remaining, low/zero wash counts |
| Visits | `VisitsChart` | Daily visit chart (7 or 30 days), per-day breakdown by type |
| Weather | `WeatherAnalytics` | Visit count vs weather, 7-day forecast |

---

## upload-page.jsx

Admin utility page (labeled "Test Page" in the UI — a name carried over from early development).

**Excel Upload:**
- Accepts `.xlsx`/`.xls` files.
- Calls `uploadCustomerRecordsFromFile()` from `utils/excel-upload.js`.
- Fetches a fresh member list before uploading (to ensure accurate pruning).
- Displays a results summary: total processed, successful, failed, and stale members removed (pruned).

**Demo Data (dev only — hidden in production):**
- `seedDemoVisits(7, 30)` — writes ~210 randomized visits for the past 7 days.
- `clearDemoVisits(7)` — deletes those seeded records.
- Only rendered when `import.meta.env.DEV` is true.
