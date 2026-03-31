# Integration Plan — Customer Webapp Features

This document covers the planning and design for integrating the CMS with the customer-facing webpage. It describes what is already in place, what needs to be modified, and what new code or infrastructure is required for each feature.

---

## Project Context

There are two apps sharing the same Firebase project:

| App | Audience | Auth |
|---|---|---|
| **CMS** (this repo) | Staff only | Firebase email/password |
| **Customer Webpage** | Members/customers | To be determined (see User Accounts) |

Because both apps point at the same Firebase project, they share the same Firestore collections and the same Auth tenant. New Firestore collections created for customer features will be immediately readable/writable from both apps, subject to Firestore Security Rules.

> **Important:** Firestore Security Rules will need to be carefully updated for every new collection so that customers can only read/write their own data, while staff retain full access. This is not optional — without it, any customer could read or modify any other customer's records.

---

## Open Decisions (Resolve Before Building)

These questions affect the design of multiple features below. They should be answered first.

1. **Book number format for gift cards** — Is it a human-assigned number (like existing member IDs) or a randomly generated one? Random avoids collisions but makes lookup harder without a QR code.
2. **Customer account linking strategy** — How does a customer's auth account connect to their member record? Options: store Firebase UID in the member document, or maintain a separate `customerAccounts` mapping collection.
3. **Social login scope** — Google is the simplest to add. Facebook and Instagram both require app review by Meta, which adds lead time. Decide which to prioritize.
4. **Clover integration depth** — Deep link (simplest, just a URL with prefilled data) vs. Clover REST API (full integration, requires Clover developer account and OAuth). These are very different scopes of work.
5. **Payment update flow** — When a subscription payment is updated in Clover, how does that sync back to the `users` collection? Options: manual staff update in CMS (existing flow), webhook via Firebase Cloud Functions (automatic), or customer self-service via webpage.

---

## Feature 1: Gift Cards

### What is already in place

- The prepaid member system (`prepaidMembers` collection, `prepaid-crud.js`) is structurally very similar to what gift cards need: an ID, a name/owner, and a remaining wash count.
- The customer search keypad already handles multi-format IDs (B/D/U prefix + digits) — the same input mechanism can support gift card book numbers.
- `logDailyVisit()` in `analytics-crud.js` already tracks `prepaid` customer type visits — a gift card type could be added here.

### What needs to be edited

| File | Change needed |
|---|---|
| `cms-app/src/api/analytics-crud.js` | Add `'gift_card'` as a valid `customerType` in `VALID_CUSTOMER_TYPES` and increment its counter in `logDailyVisit()` |
| `cms-app/src/pages/customer-search-page.jsx` | Add gift card ID pattern to the input regex and lookup logic. Determine the prefix (e.g., `G` + digits) and route it to the new `getGiftCard` function |
| `cms-app/src/App.jsx` | Add route for the new gift card management page |
| `cms-app/src/components/HamburgerMenu.jsx` | Add "Gift Cards" nav item to the `menuItems` array |
| `cms-app/src/context/MembersContext.jsx` | Add gift card state and CRUD wrappers (following the same pattern as loyalty and prepaid) |

### New code required (CMS)

| File | Purpose |
|---|---|
| `cms-app/src/api/gift-card-crud.js` | New CRUD module for the `giftCards` Firestore collection |
| `cms-app/src/pages/gift-cards-page.jsx` | CMS page to create, view, and manage gift cards — similar to the loyalty/prepaid tabs in `customer-list-page.jsx` |
| `cms-app/src/css/gift-cards-page.css` | Styles for the gift card management page |

### New code required (Customer Webpage)

- A gift card purchase flow (select wash count, enter payment)
- A gift card balance lookup page (enter book number, see remaining washes)
- If the customer has an account, a "my gift cards" view

### New Firestore collection: `giftCards`

```
Document ID: book number (e.g., "G1001")
Fields:
  bookNumber:      string    — same as document ID, for readability
  remainingWashes: number    — decremented each use
  totalWashes:     number    — original purchase amount
  purchaseDate:    string    — YYYY-MM-DD
  ownerUid:        string?   — Firebase UID if purchased by a logged-in customer
  ownerName:       string?   — optional name
  notes:           string
```

### QR code vs. book number

The existing system is entirely book-number based (staff type IDs into the keypad). A book number for gift cards is consistent with that workflow. QR codes are an enhancement that could be added later — the book number should be the primary lookup method. If QR codes are added, they can encode the book number and be scanned via a camera on the search page.

---

## Feature 2: Loyalty Enhancements

### What is already in place

- `loyaltyMembers` Firestore collection with `visitCount`, `lastVisitDate`, `issueDate`
- `loyalty-crud.js` — full CRUD
- `MembersContext.jsx` — loyalty state, lazy loading, cache-first reads, CRUD wrappers
- `customer-search-page.jsx` — loyalty lookup, free wash detection (every 10th visit), visit logging
- `LoyaltyStats` component — total members, avg visits, near-free-wash count
- `analytics-crud.js` — already logs `loyalty` type visits with wash type breakdown

### What is NOT yet in place

- Customer self-service account creation (currently staff-only via the CMS)
- Total lifetime free washes given out across all loyalty members (analytics gap)
- Per-visit activity history (only `visitCount` + `lastVisitDate`, no log of individual visits)
- Customer-facing view: "You have X visits, your next free wash is in Y visits"

### What needs to be edited

| File | Change needed |
|---|---|
| `cms-app/src/components/LoyaltyStats.jsx` | Add a "Total Free Washes Given" stat card — derivable from `Math.floor(visitCount / 10)` summed across all members |
| `cms-app/src/api/analytics-crud.js` | Optionally add a dedicated `freeWashesLog` write when a free wash is issued, for more precise long-term tracking |
| `cms-app/src/pages/customer-search-page.jsx` | No changes required for existing loyalty flow — customer account creation is a new customer-webapp concern |

### New code required (Customer Webpage)

- Loyalty sign-up form: collects name, email → calls `createLoyaltyMember()` with a staff- or auto-assigned ID
- "My loyalty card" page: shows visit count, progress toward next free wash, last visit date
- This requires the customer to be authenticated and their UID linked to their loyalty member document

### Firestore change: `loyaltyMembers`

Add an optional `ownerUid` field to each loyalty member document. This links the Firestore record to a Firebase Auth customer account and is what allows the customer webpage to fetch "my" loyalty record.

```
ownerUid: string? — Firebase UID of the customer account owner
```

---

## Feature 3: Monthly Membership Enhancements

### What is already in place

- `users` Firestore collection with `name`, `car`, `status`, `notes`, `email`
- `firebase-crud.js` — full CRUD including `upsertMember` for Excel sync
- `customer-search-page.jsx` — subscription lookup, status display (active/inactive/payment needed)
- `customer-list-page.jsx` — full management UI with add/edit/delete and Excel export
- `upload-page.jsx` — bulk sync from the business's Excel spreadsheet
- `MembershipStats` — subscription analytics

### What is NOT yet in place

- Customer self-service sign-up (currently paper form → staff enters data)
- Customer-facing view of their own subscription tier and status
- Payment integration with Clover
- Webhook or mechanism to automatically update `status` when payment succeeds or lapses

### What needs to be edited

| File | Change needed |
|---|---|
| `cms-app/src/api/firebase-crud.js` | Add `ownerUid` field support — add it as an optional parameter to `createMember` and `upsertMember`, and include it in the document schema |
| `cms-app/src/pages/customer-list-page.jsx` | Surface `ownerUid` in the edit modal so staff can manually link a customer account if needed |
| `cms-app/src/pages/upload-page.jsx` | No immediate changes — Excel sync will continue to work alongside digital sign-up as the two write to the same collection |

### New code required (CMS)

| File | Purpose |
|---|---|
| `cms-app/src/pages/recent-accounts-page.jsx` (or a tab in an existing page) | View recently created customer accounts — lists Firebase Auth users sorted by creation time, shows linked member ID if present |

### New code required (Customer Webpage)

- **Digital sign-up form**: collects name, car, email, preferred tier (Basic/Deluxe/Unlimited) → writes to `users` collection with `status: 'payment_needed'` until payment is confirmed. This replaces the paper form.
- **My subscription page**: shows current tier, status, next payment date (if tracked), and a button to manage payment (linking to Clover).
- **Clover integration** (two options, decide based on scope):
  - *Option A — Deep link*: Construct a URL that opens Clover with the customer and subscription pre-filled. No API key needed. Payment confirmation must be done manually by staff.
  - *Option B — Clover REST API*: Requires a Clover developer account and OAuth. Enables automatic payment status updates. If pursued, a **Firebase Cloud Function** should be used as the backend to keep the Clover API credentials off the client.

### Firestore change: `users`

```
Add optional field:
  ownerUid: string? — Firebase UID of the customer account owner
  tier:     string? — 'B' | 'D' | 'U' (derivable from ID prefix, but storing it explicitly helps the customer webpage)
```

---

## Feature 4: Customer User Accounts

### What is already in place

- Firebase Auth is already initialized and configured in `firebaseconfig.js`
- `firebase-auth.js` has `signIn()` and `createUser()` for email/password — these can serve as the starting point for a customer auth flow on the webpage
- The Firebase Auth SDK already supports Google, Facebook, and other providers — they just need to be enabled in the Firebase console and wired up in code

### What needs to be edited

| File | Change needed |
|---|---|
| `cms-app/src/api/firebase-auth.js` | Optionally add a `signInWithGoogle()` export using `GoogleAuthProvider` — this is shared infrastructure that both apps could import |
| `cms-app/src/api/firebaseconfig.js` | No code changes needed — social providers are enabled in the Firebase console, not in config |

### New code required (CMS — backend visibility)

| File | Purpose |
|---|---|
| `cms-app/src/api/admin-auth.js` | Functions to list/query Firebase Auth users — requires Firebase Admin SDK, which means this logic must run server-side (Cloud Function) rather than in the browser |
| `cms-app/src/pages/accounts-page.jsx` | CMS page showing recently created customer accounts, linked member records, and account status |
| `cms-app/src/css/accounts-page.css` | Styles |

### New code required (Customer Webpage)

- Auth flow with email/password and any enabled social providers
- Account creation → write to a `customerAccounts` collection (see below) to establish the UID ↔ member ID link
- Profile page: shows linked membership type and relevant info

### New Firestore collection: `customerAccounts`

This is the bridge between a customer's Firebase Auth identity and their member record(s). One document per customer.

```
Document ID: Firebase Auth UID
Fields:
  email:           string
  displayName:     string
  createdAt:       Timestamp
  memberType:      'subscription' | 'loyalty' | 'prepaid' | null
  memberId:        string?   — e.g., "B101", "L202"
  linkedAt:        Timestamp?
```

> An alternative is storing `ownerUid` directly in the member document (described in features 2 and 3 above). Both approaches work — the `customerAccounts` collection makes it easier to look up "who is this user?" from the CMS, while `ownerUid` on the member document makes it easier to query "what is this user's member record?" Both can coexist.

### Social login considerations

| Provider | Effort | Notes |
|---|---|---|
| **Google** | Low | Enable in Firebase console, add `GoogleAuthProvider`. No app review needed. |
| **Facebook** | Medium | Requires a Meta Developer app and app review for production use. |
| **Instagram** | High | Instagram login is now part of Meta's platform, requires Meta Business verification. Not recommended unless there's a specific reason. |

**Recommendation:** Start with Google. It is the lowest-friction option for customers and requires no external review process.

### Firebase Cloud Functions requirement

Several features above require server-side code that cannot safely run in the browser:

| Use case | Why server-side |
|---|---|
| Listing Firebase Auth users in the CMS | Firebase Admin SDK cannot be used in the browser |
| Clover API calls (Option B) | API credentials must not be exposed to the client |
| Automatic payment status webhook from Clover | Needs a public HTTPS endpoint to receive the webhook |
| Writing `customerAccounts` with elevated trust | Avoids clients writing arbitrary data to their own account document |

All of these can be implemented as **Firebase Cloud Functions** (Node.js). This is a new dependency — Cloud Functions are not currently used in either project.

---

## Summary Table

| Feature | New Collections | New CMS Files | Edit CMS Files | New Webpage Concern |
|---|---|---|---|---|
| Gift cards | `giftCards` | `gift-card-crud.js`, `gift-cards-page.jsx`, `gift-cards-page.css` | `analytics-crud.js`, `customer-search-page.jsx`, `App.jsx`, `HamburgerMenu.jsx`, `MembersContext.jsx` | Purchase, balance lookup, "my gift cards" |
| Loyalty enhancements | — (add `ownerUid` field) | — | `LoyaltyStats.jsx`, `analytics-crud.js` (optional) | Sign-up form, "my loyalty card" |
| Monthly memberships | — (add `ownerUid`, `tier` fields) | `recent-accounts-page.jsx` | `firebase-crud.js`, `customer-list-page.jsx` | Digital sign-up form, "my subscription", Clover link |
| Customer accounts | `customerAccounts` | `admin-auth.js`, `accounts-page.jsx`, `accounts-page.css` | `firebase-auth.js`, `App.jsx`, `HamburgerMenu.jsx` | Full auth flow, social login, profile page |
| Cloud Functions | — | New `functions/` directory in repo | — | Shared backend for Admin SDK + Clover webhook |
