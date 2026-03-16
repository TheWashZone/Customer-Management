# Context

`cms-app/src/context/MembersContext.jsx` provides a single global store for all three member types. It wraps the raw Firestore API calls with an in-memory cache so that most interactions don't require repeat database reads.

---

## How to use it

```js
import { useMembers } from '../context/MembersContext';

const { members, updateMember, loyaltyMembers, ensureLoyaltyLoaded } = useMembers();
```

`useMembers()` throws if called outside of `MembersProvider`. The provider is mounted in `App.jsx` and wraps all routes.

---

## Provider setup

`MembersProvider` takes a `user` prop (the Firebase Auth user object from `App.jsx`). When `user` is `null` (logged out), all cached state is cleared.

```jsx
<MembersProvider user={user}>
  {children}
</MembersProvider>
```

---

## Loading behavior

| Collection | When it loads |
|---|---|
| Subscription (`users`) | Automatically on mount when `user` is set |
| Loyalty (`loyaltyMembers`) | Lazy — call `ensureLoyaltyLoaded()` to trigger |
| Prepaid (`prepaidMembers`) | Lazy — call `ensurePrepaidLoaded()` to trigger |

Lazy loading avoids fetching loyalty and prepaid data until a page actually needs them (e.g., when the Loyalty or Prepaid tab in `AnalyticsPage` is opened, or when `CustomerListPage` switches to those tabs).

---

## What's exposed via `useMembers()`

### Subscription members

| Value | Type | Description |
|---|---|---|
| `members` | `Array` | All subscription members (cached) |
| `isLoading` | `boolean` | True while initial fetch is in progress |
| `error` | `string\|null` | Error message if load failed |
| `getMember(id)` | `Function` | Returns from cache first, then Firestore |
| `createMember(...)` | `Function` | Creates member and updates cache |
| `upsertMember(id, name, car, status)` | `Function` | Used by Excel upload |
| `updateMember(id, updates)` | `Function` | Partial update, syncs cache |
| `deleteMember(id)` | `Function` | Deletes and removes from cache |
| `refreshMembers()` | `Function` | Forces a fresh fetch from Firestore |

### Loyalty members

| Value | Type | Description |
|---|---|---|
| `loyaltyMembers` | `Array` | All loyalty members (cached after first load) |
| `isLoyaltyLoading` | `boolean` | True while loading |
| `loyaltyError` | `string\|null` | Error message if load failed |
| `ensureLoyaltyLoaded()` | `Function` | Triggers the lazy load (safe to call multiple times) |
| `getLoyaltyMember(id)` | `Function` | Cache-first lookup |
| `createLoyaltyMember(...)` | `Function` | Creates and caches |
| `updateLoyaltyMember(id, updates)` | `Function` | Updates and syncs cache |
| `deleteLoyaltyMember(id)` | `Function` | Deletes and removes from cache |
| `refreshLoyaltyMembers()` | `Function` | Force refresh |

### Prepaid members

Same pattern as loyalty:

`prepaidMembers`, `isPrepaidLoading`, `prepaidError`, `ensurePrepaidLoaded`, `getPrepaidMember`, `createPrepaidMember`, `updatePrepaidMember`, `deletePrepaidMember`, `refreshPrepaidMembers`

---

## Key behaviors to know

- **Cache-first reads:** `getMember`, `getLoyaltyMember`, and `getPrepaidMember` all check the in-memory array before hitting Firestore. This keeps the search page fast.
- **Optimistic local updates:** Every mutation updates the in-memory state immediately after the Firestore call succeeds, so the UI reflects changes without a re-fetch.
- **No real-time listeners:** The app does not use Firestore `onSnapshot`. Data is fetched once per session (or on explicit refresh). If two staff members are editing simultaneously, they won't see each other's changes without refreshing.
