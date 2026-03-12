# API

All Firebase API modules live in `cms-app/src/api/`. Each module talks to a specific Firestore collection or external service. Import what you need directly — the context layer wraps most of these for in-app use.

---

## Files

| File | Purpose |
|---|---|
| `firebaseconfig.js` | Initializes the Firebase app and exports `db`, `auth`, `app` |
| `firebase-auth.js` | Email/password sign-in and account creation |
| `firebase-crud.js` | CRUD for subscription members (`users` collection) |
| `loyalty-crud.js` | CRUD for loyalty members (`loyaltyMembers` collection) |
| `prepaid-crud.js` | CRUD for prepaid members (`prepaidMembers` collection) |
| `analytics-crud.js` | Daily visit tracking (`dailyVisits` collection) |
| `settings-crud.js` | Wash price settings (`settings/washPrices` document) |
| `open-meteo.js` | External weather API (free, no auth required) |

---

## firebaseconfig.js

Reads Firebase credentials from `VITE_FIREBASE_*` environment variables. In development (`import.meta.env.DEV`), automatically connects to the local Firebase emulator (Auth on port 9099, Firestore on port 8080).

**Exports:** `db`, `auth`, `app`

---

## firebase-auth.js

| Function | Description |
|---|---|
| `signIn(email, password)` | Signs in and returns the Firebase user object |
| `createUser(email, password)` | Creates a new Firebase Auth account |

Both re-throw errors so the caller can handle specific error codes (e.g., `auth/invalid-credential`).

---

## firebase-crud.js — `users` collection

Subscription member documents. Document ID is the member ID (e.g., `B101`).

**Document shape:**
```js
{ name, car, status, notes, email }
// status: 'active' | 'inactive' | 'payment_needed'
```

| Function | Description |
|---|---|
| `createMember(id, name, car, status, notes, email?)` | Creates or overwrites a member document |
| `upsertMember(id, name, car, status)` | Transactionally updates if exists, creates if not. Preserves `notes` and `email` on update. |
| `getMember(id)` | Returns one member or `null` |
| `getAllMembers()` | Returns all members |
| `getMembersByStatus(status)` | Filters by status |
| `updateMember(id, updates)` | Partial field update. Throws if member does not exist. |
| `deleteMember(id)` | Deletes a member. Throws if not found. |

> `upsertMember` is the function used during Excel uploads. It intentionally only writes name/car/status to avoid overwriting notes or emails that staff entered manually.

---

## loyalty-crud.js — `loyaltyMembers` collection

**Document shape:**
```js
{ name, issueDate, lastVisitDate, visitCount, notes, email }
```

| Function | Description |
|---|---|
| `createLoyaltyMember(id, name, issueDate, lastVisitDate, visitCount, notes, email?)` | Creates a loyalty member |
| `getLoyaltyMember(id)` | Returns one member or `null` |
| `getAllLoyaltyMembers()` | Returns all loyalty members |
| `updateLoyaltyMember(id, updates)` | Partial update. Throws if not found. |
| `deleteLoyaltyMember(id)` | Deletes. Throws if not found. |

> Loyalty members earn a free wash every 10 visits. The app tracks this via `visitCount`.

---

## prepaid-crud.js — `prepaidMembers` collection

**Document shape:**
```js
{ name, issueDate, lastVisitDate, prepaidWashes, notes, email }
```

| Function | Description |
|---|---|
| `createPrepaidMember(id, name, issueDate, lastVisitDate, prepaidWashes, notes, email?)` | Creates a prepaid member |
| `getPrepaidMember(id)` | Returns one member or `null` |
| `getAllPrepaidMembers()` | Returns all prepaid members |
| `updatePrepaidMember(id, updates)` | Partial update. Throws if not found. |
| `deletePrepaidMember(id)` | Deletes. Throws if not found. |

---

## analytics-crud.js — `dailyVisits` collection

Tracks daily customer visit counts. Document IDs are dates in `YYYY-MM-DD` format.

**Document shape:**
```js
{
  date: Timestamp,       // start of day UTC
  count: number,         // total visits
  createdAt: Timestamp,
  lastUpdated: Timestamp,
  // customer type breakdown:
  subscription, loyalty, prepaid, cash,
  // wash type breakdown per customer type:
  subB, subD, subU,
  preB, preD, preU,
  loyB, loyD, loyU,
  cashB, cashD, cashU,
}
```

Wash type keys: `B` = Basic, `D` = Deluxe, `U` = Unlimited.

| Function | Description |
|---|---|
| `logDailyVisit(customerType?, washType?)` | Atomically increments today's count. Creates the document if it doesn't exist yet. |
| `getDailyVisitCount(dateString)` | Returns visit data for one date or `null` |
| `getDailyVisitsInRange(startDate, endDate)` | Returns sorted array of visit docs within a date range |
| `cleanupOldVisitData()` | Deletes records older than 365 days. Called once daily from `App.jsx`. |
| `seedDemoVisits(numDays?, visitsPerDay?)` | Dev-only: writes randomized visit data for testing |
| `clearDemoVisits(numDays?)` | Dev-only: removes seeded data |

Valid `customerType` values: `'subscription'`, `'loyalty'`, `'prepaid'`, `'cash'`
Valid `washType` values: `'B'`, `'D'`, `'U'`

---

## settings-crud.js — `settings/washPrices` document

Stores the cash wash prices used in the analytics revenue estimate.

**Document shape:** `{ B: number, D: number, U: number }`

Default prices: B = $10.00, D = $13.50, U = $16.50 (used as fallback if document doesn't exist).

| Function | Description |
|---|---|
| `getWashPrices()` | Returns current prices, falling back to defaults |
| `updateWashPrices(prices)` | Overwrites the prices document |

---

## open-meteo.js

Wraps the free [Open-Meteo](https://open-meteo.com) weather API. No API key required.

Hardcoded defaults are set to **Walla Walla, WA** (lat: 46.08, lon: -118.31).

| Export | Description |
|---|---|
| `fetchDailyForecast(options?)` | Fetches historical + forecast weather data. Returns Open-Meteo daily JSON. |
| `weatherCodeToDescription(code)` | Maps a WMO weather code to `{ emoji, label, severity }`. Severity is `'good'`, `'neutral'`, or `'poor'`. |
