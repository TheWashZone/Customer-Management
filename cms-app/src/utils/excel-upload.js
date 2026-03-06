import ExcelJS from 'exceljs';

/**
 * Checks if a cell has a specific fill color
 * @param {Object} cell - ExcelJS cell object
 * @param {string} colorType - 'gray' or 'yellow'
 * @returns {boolean} - True if cell has the specified color
 */
function hasFillColor(cell, colorType) {
  if (!cell || !cell.fill || cell.fill.type !== 'pattern') {
    return false;
  }

  const fgColor = cell.fill.fgColor;
  if (!fgColor) {
    return false;
  }

  // Check for gray using theme color
  if (colorType === 'gray') {
    // Gray is stored as theme 2 with tint -0.499984740745262
    if (fgColor.theme === 2 && fgColor.tint !== undefined) {
      const tint = fgColor.tint;
      const isGray = tint < -0.49 && tint > -0.51;
      return isGray;
    }
  }

  // Check for yellow and other colors using direct ARGB
  if (fgColor.argb) {
    const argb = fgColor.argb.toUpperCase();

    const yellowColors = [
      'FFFFFF00',
    ];

    if (colorType === 'yellow') {
      return yellowColors.includes(argb);
    }
  }

  return false;
}

/**
 * Checks if any cell in a row has the specified fill color
 * @param {Object} row - ExcelJS row object
 * @param {string} colorType - 'gray' or 'yellow'
 * @returns {boolean} - True if any cell in the row has the specified color
 */
function rowHasColor(row, colorType) {
  if (!row) return false;

  for (let col = 1; col <= 4; col++) {
    const cell = row.getCell(col);
    if (hasFillColor(cell, colorType)) {
      return true;
    }
  }

  return false;
}

/**
 * Reads Excel file (browser version), upserts customer records, and prunes
 * members that no longer appear in the spreadsheet.
 *
 * @param {File} file - File object from browser input
 * @param {Object} options
 * @param {Function} options.upsertMember  - (id, name, car, isActive, validPayment) => Promise
 * @param {Function} options.deleteMember  - (id) => Promise  (used for pruning)
 * @param {string[]} options.existingMemberIds - IDs currently in the database
 * @returns {Promise<Object>} - Results with success / error / pruned counts
 */
export async function uploadCustomerRecordsFromFile(file, { upsertMember, deleteMember, existingMemberIds = [] }) {
  if (!upsertMember || typeof upsertMember !== 'function') {
    throw new Error('upsertMember must be a function');
  }

  const workbook = new ExcelJS.Workbook();
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    pruned: 0,
    errors: [],
  };

  try {
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheet found in the Excel file');
    }

    const uploadedIds = new Set();
    const promises = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;

      const processRow = async () => {
        try {
          results.total++;

          const name = row.getCell(1).value?.toString().trim() || '';
          const idPart1 = row.getCell(2).value?.toString().trim() || '';
          const idPart2 = row.getCell(3).value?.toString().trim() || '';
          const car = row.getCell(4).value?.toString().trim() || '';
          const id = `${idPart1}${idPart2}`;

          const isActive = !rowHasColor(row, 'gray');
          const validPayment = !rowHasColor(row, 'yellow');

          if (!id) {
            results.failed++;
            results.errors.push({ row: rowNumber, error: 'No ID found (columns B + C are empty)' });
            return;
          }

          uploadedIds.add(id);
          await upsertMember(id, name, car, isActive, validPayment);
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({ row: rowNumber, error: error.message });
          console.error(`Row ${rowNumber}: Error upserting member - ${error.message}`);
        }
      };

      promises.push(processRow());
    });

    await Promise.all(promises);

    // Prune members that exist in the DB but are absent from the new file
    if (deleteMember && existingMemberIds.length > 0) {
      const staleIds = existingMemberIds.filter((id) => !uploadedIds.has(id));
      const prunePromises = staleIds.map(async (id) => {
        try {
          await deleteMember(id);
          results.pruned++;
        } catch (error) {
          results.errors.push({ id, error: `Failed to prune member ${id}: ${error.message}` });
        }
      });
      await Promise.all(prunePromises);
    }
  } catch (error) {
    console.error('Error reading Excel file:', error);
    throw error;
  }

  return results;
}

/**
 * Reads Excel file and uploads customer records to Firebase (Node.js version)
 * @param {string} filePath - Path to the Excel file
 * @param {Object} options
 * @param {Function} options.upsertMember  - (id, name, car, isActive, validPayment) => Promise
 * @param {Function} [options.deleteMember]  - (id) => Promise  (used for pruning)
 * @param {string[]} [options.existingMemberIds] - IDs currently in the database
 * @returns {Promise<Object>} - Results with success / error / pruned counts
 */
export async function uploadCustomerRecords(filePath, { upsertMember, deleteMember, existingMemberIds = [] }) {
  if (!upsertMember || typeof upsertMember !== 'function') {
    throw new Error('upsertMember must be a function');
  }

  const workbook = new ExcelJS.Workbook();
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    pruned: 0,
    errors: [],
  };

  try {
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheet found in the Excel file');
    }

    const uploadedIds = new Set();
    const promises = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;

      const processRow = async () => {
        try {
          results.total++;

          const name = row.getCell(1).value?.toString().trim() || '';
          const idPart1 = row.getCell(2).value?.toString().trim() || '';
          const idPart2 = row.getCell(3).value?.toString().trim() || '';
          const car = row.getCell(4).value?.toString().trim() || '';
          const id = `${idPart1}${idPart2}`;

          const isActive = !rowHasColor(row, 'gray');
          const validPayment = !rowHasColor(row, 'yellow');

          if (!id) {
            results.failed++;
            results.errors.push({ row: rowNumber, error: 'No ID found (columns B + C are empty)' });
            return;
          }

          uploadedIds.add(id);
          await upsertMember(id, name, car, isActive, validPayment);
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({ row: rowNumber, error: error.message });
          console.error(`Row ${rowNumber}: Error upserting member - ${error.message}`);
        }
      };

      promises.push(processRow());
    });

    await Promise.all(promises);

    if (deleteMember && existingMemberIds.length > 0) {
      const staleIds = existingMemberIds.filter((id) => !uploadedIds.has(id));
      const prunePromises = staleIds.map(async (id) => {
        try {
          await deleteMember(id);
          results.pruned++;
        } catch (error) {
          results.errors.push({ id, error: `Failed to prune member ${id}: ${error.message}` });
        }
      });
      await Promise.all(prunePromises);
    }
  } catch (error) {
    console.error('Error reading Excel file:', error);
    throw error;
  }

  return results;
}
