# CSS

Each page and the navigation component has its own scoped CSS file in `cms-app/src/css/`. There is no global stylesheet beyond Bootstrap (imported in `customer-list-page.jsx`).

---

## Files

| File | Scope |
|---|---|
| `login-page.css` | Login form layout and styling |
| `customer-search-page.css` | Keypad, member detail cards, overlays, and action buttons |
| `customer-list-page.css` | Table, tab, modal, and badge styles for the member list |
| `analytics-page.css` | Analytics page container layout |
| `hamburger-menu.css` | Hamburger button and sidebar animations |

---

## Notes

- **Bootstrap** provides the base grid, cards, modals, badges, and form components. Page-level CSS files add layout adjustments and custom components on top.
- **`customer-search-page.css`** is the most extensive file — it handles the keypad grid, the member detail card layout, the wash selection popup overlay, the edit popup, and the free-wash banner.
- **`hamburger-menu.css`** controls the three-line button animation (open/close) and the fixed positioning of the button in the top-left corner.
- Analytics components (`MembershipStats`, `VisitsChart`, etc.) rely entirely on Bootstrap and Recharts for styling — they have no separate CSS files.
