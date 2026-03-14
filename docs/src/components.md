# Components

Reusable components live in `cms-app/src/components/`. Most are analytics display components consumed by `AnalyticsPage`, plus the shared navigation component.

---

## Files

| File | Component | Used In |
|---|---|---|
| `HamburgerMenu.jsx` | `HamburgerMenu` | All pages |
| `MembershipStats.jsx` | `MembershipStats` | `AnalyticsPage` (Subscriptions tab) |
| `LoyaltyStats.jsx` | `LoyaltyStats` | `AnalyticsPage` (Loyalty tab) |
| `PrepaidStats.jsx` | `PrepaidStats` | `AnalyticsPage` (Prepaid tab) |
| `VisitsChart.jsx` | `VisitsChart` | `AnalyticsPage` (Visits tab) |
| `WeatherAnalytics.jsx` | `WeatherAnalytics` | `AnalyticsPage` (Weather tab) |
| `WeatherCards.jsx` | `WeatherCards` | Not currently used in any page (available) |

---

## HamburgerMenu

A persistent navigation control rendered at the top-left of every authenticated page.

- Opens a Bootstrap `Offcanvas` sidebar with links to all four main routes.
- Highlights the active route using `useLocation()`.
- Has no props.

---

## MembershipStats

Displays subscription member analytics. Reads from `MembersContext` (`members`, `isLoading`) — no extra data fetch needed since subscription members load on app startup.

**Shows:**
- Stat cards: Total, Active, Inactive, Payment Needed, Active Rate %
- Pie chart of members by tier (B/D/U) using Recharts
- Detailed breakdown table: active vs. total per tier

---

## LoyaltyStats

Displays loyalty member analytics. Calls `ensureLoyaltyLoaded()` on mount to trigger a lazy fetch if loyalty members haven't been loaded yet.

**Shows:**
- Stat cards: Total Members, Avg Visit Count, Highest Visits, Near Free Wash (visit count % 10 >= 8)

---

## PrepaidStats

Displays prepaid member analytics. Calls `ensurePrepaidLoaded()` on mount.

**Shows:**
- Stat cards: Total Members, Avg Washes Remaining, No Washes Left (count = 0), Low Washes (1–2 remaining)

---

## VisitsChart

The most data-rich component. Fetches visit data from Firestore on mount and when the view mode changes.

**Features:**
- Toggle between **Last 7 Days** and **Last 30 Days**
- Toggle between **Line** and **Bar** chart types (Recharts)
- Summary stat cards: Total Visits, Average/Day, Peak Day, Lowest Day
- **Day navigator** — click through each day to see a breakdown by customer type (subscription/loyalty/prepaid/cash) and wash type (B/D/U)
- **Expected cash revenue** — computed from `cashB/D/U` counts × wash prices fetched from Firestore
- **Edit Prices modal** — allows updating `settings/washPrices` directly from this component

> Days with no visit data show as 0 (the chart fills in missing dates with zeroes so the x-axis is always continuous).

---

## WeatherAnalytics

Fetches and correlates weather data (Open-Meteo) with visit data (Firestore) for the past 30 days.

**Features:**
- Summary cards: Avg visits on good-weather days vs. poor-weather days, and the difference
- Bar chart of daily visits color-coded by WMO weather condition
- Custom x-axis tick rendering: weather emoji above the rotated date label
- 7-day weather forecast table with an "Expected Impact" badge (higher/lower/typical visits)

---

## WeatherCards

A standalone paginated weather card view. Accepts an Open-Meteo JSON object as a prop and displays 7 days at a time with prev/next week navigation.

> This component is currently not wired into any page. It appears to be an earlier iteration that predates `WeatherAnalytics`. It can be used independently if needed by passing the result of `fetchDailyForecast()` as the `data` prop.
