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
| `monthly-pass-crud.js` | CRUD for monthly passes (`monthlyPasses` subcollection in the `users` collection) |
| `visit-crud.js` | CRUD for visits (`visits` collection) |
| `analytics-crud.js` | Daily visit tracking (`visits` collection) |
| `settings-crud.js` | Wash price settings (`settings/washPrices` document) |
| `open-meteo.js` | External weather API (free, no auth required) |
| `memberId-counter.js` | Gets the next available member ID |
| `visit-counter.js` | Gets the next available visit ID |


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
{ date, name, contact_person, address, phone_number, email }
```

| Function | Description |
|---|---|
| `createMember(id, name, contact_person, address, phone_number, email?)` | Creates or overwrites a member document |
| `createMemberWithMonthlyPass(userId, passId, name, contact_person, address, phone_number, email?, plan_type, status, vehicle?, notes?)` | Creates a member and monthly pass together in a transaction |
| `upsertMember(id, name, contact_person, address, phone_number, email?)` | Transactionally updates if exists, creates if not. |
| `getMember(id)` | Returns one member or `null` |
| `getAllMembers()` | Returns all members |
| `getMemberByMonthlyPassId(passId)` | Finds a member by monthly pass ID |
| `updateMember(id, updates)` | Partial field update. Throws if member does not exist. |
| `deleteMember(id)` | Deletes a member and its monthly passes. Throws if not found. |

> The current implementation stores member contact info in `contact_person`, `address`, and `phone_number`, and creates a `date` field at creation time.

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

## visit-crud.js — `visits` collection

Visit documents are stored in the `visits` collection.

**Document shape:**
```js
{ visit_date, wash_type, payment_type, monthly_pass_id }
```

| Function | Description |
|---|---|
| `createVisit(visitId, washType, paymentType, monthlyPassId?)` | Creates or overwrites a visit document |
| `upsertVisit(id, washType, paymentType, monthlyPassId?)` | Creates or updates a visit document in a transaction |
| `getVisit(visitId)` | Returns one visit or `null` |
| `getAllVisits()` | Returns all visits |
| `getVisitsByDate(visitDate)` | Returns visits for a specific date |
| `getVisitsByWashType(washType)` | Returns visits filtered by wash type |
| `getVisitsByPaymentType(paymentType)` | Returns visits filtered by payment type |
| `getVisitsByMonthlyPassId(monthlyPassId)` | Returns visits tied to a monthly pass |
| `updateVisit(visitId, updates)` | Partial visit update. Throws if visit does not exist. |
| `deleteVisit(visitId)` | Deletes a visit. Throws if not found. |
| `aggregateVisitsByDateRange(startDate, endDate, paymentType?)` | Returns aggregated daily visit breakdowns over a date range |

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
