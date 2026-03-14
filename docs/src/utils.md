# Utils

`cms-app/src/utils/` contains helper modules that are not React components or API calls.

---

## excel-upload.js

Handles parsing an Excel file and syncing its contents to Firestore. Used by `UploadPage`.

### Functions

#### `uploadCustomerRecordsFromFile(file, options)` — browser version

Takes a browser `File` object (from `<input type="file">`).

```js
const results = await uploadCustomerRecordsFromFile(file, {
  upsertMember,       // from MembersContext
  deleteMember,       // from MembersContext
  existingMemberIds,  // string[] of all current member IDs
});
```

Returns:
```js
{ total, successful, failed, pruned, errors: [{ row, error }] }
```

#### `uploadCustomerRecords(filePath, options)` — Node.js version

Same logic but accepts a file path string instead of a `File` object. Intended for scripts run outside the browser.

---

### Expected Excel format

| Column A | Column B | Column C | Column D |
|---|---|---|---|
| Name | ID prefix (e.g., `B`, `D`) | ID number (e.g., `101`) | Car description |

- Row 1 is a header and is skipped.
- The full member ID is constructed as `${columnB}${columnC}` (e.g., `B101`).
- Rows where Column C is missing or non-numeric are silently skipped (treated as annotation rows).

---

### Status detection from cell fill color

Member status is inferred from Excel cell background color — no text column needed:

| Fill color | Status |
|---|---|
| No fill / white | `active` |
| Gray (theme 2, tint ≈ -0.5) | `inactive` |
| Yellow (`#FFFF00`) | `payment_needed` |

---

### Pruning behavior

After upserting all rows, any member ID that exists in Firestore but was **absent** from the uploaded file is deleted ("pruned"). This keeps the database in sync with the master Excel spreadsheet.

**Pruning is skipped if:**
- Any row failed to upsert (to avoid deleting members due to a partial upload)
- `existingMemberIds` is empty
- `deleteMember` is not provided
