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
      // Check if tint is approximately -0.5 (allowing for small floating point differences)
      const tint = fgColor.tint;
      const isGray = tint < -0.49 && tint > -0.51;
      return isGray;
    }
  }

  // Check for yellow and other colors using direct ARGB
  if (fgColor.argb) {
    const argb = fgColor.argb.toUpperCase();

    const yellowColors = [
      'FFFFFF00', // Your specific yellow color
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

  // Check cells A through D (columns 1-4)
  for (let col = 1; col <= 4; col++) {
    const cell = row.getCell(col);
    if (hasFillColor(cell, colorType)) {
      return true;
    }
  }

  return false;
}

/**
 * Reads Excel file (browser version) and uploads customer records to Firebase
 * @param {File} file - File object from browser input
 * @param {Function} createMember - Function to create a member (from context or firebase-crud)
 * @returns {Promise<Object>} - Results object with success/error counts
 */
export async function uploadCustomerRecordsFromFile(file, createMember) {
  if (!createMember || typeof createMember !== 'function') {
    throw new Error('createMember must be a function');
  }

  const workbook = new ExcelJS.Workbook();
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Read the Excel file from browser File object
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);

    // Get the first worksheet
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new Error('No worksheet found in the Excel file');
    }

    // console.log(`Processing worksheet: ${worksheet.name}`);
    // console.log(`Total rows: ${worksheet.rowCount}`);

    // Collect all promises to wait for them
    const promises = [];

    // Iterate through rows (starting from row 2 to skip header, adjust if needed)
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      // Skip header row (adjust this if your data starts on a different row)
      if (rowNumber === 1) {
        return;
      }

      const processRow = async () => {
        try {
          results.total++;

          // Extract data from columns
          const name = row.getCell(1).value?.toString().trim() || ''; // Column A
          const idPart1 = row.getCell(2).value?.toString().trim() || ''; // Column B
          const idPart2 = row.getCell(3).value?.toString().trim() || ''; // Column C
          const car = row.getCell(4).value?.toString().trim() || ''; // Column D

          // Concatenate B + C for the ID
          const id = `${idPart1}${idPart2}`;

          // Determine isActive based on gray fill color
          const isActive = !rowHasColor(row, 'gray');

          // Determine validPayment based on yellow fill color
          const validPayment = !rowHasColor(row, 'yellow');

          // Defaults notes column to empty string
          const notes = '';

          // Validate that we have at least an ID
          if (!id) {
            console.warn(`Row ${rowNumber}: Skipping - no ID found`);
            results.failed++;
            results.errors.push({
              row: rowNumber,
              error: 'No ID found (columns B + C are empty)',
            });
            return;
          }

          // Log the data being processed
        //   console.log(`Row ${rowNumber}:`, {
        //     id,
        //     name,
        //     car,
        //     isActive,
        //     validPayment,
        //   });

          // Default email to empty string
          const email = '';

          // Create the member in Firebase
          await createMember(id, name, car, isActive, validPayment, notes, email);

          results.successful++;
        //   console.log(`✓ Row ${rowNumber}: Successfully created member ${id}`);
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            error: error.message,
          });
          console.error(`✗ Row ${rowNumber}: Error creating member - ${error.message}`);
        }
      };

      promises.push(processRow());
    });

    // Wait for all rows to be processed
    await Promise.all(promises);

  } catch (error) {
    console.error('Error reading Excel file:', error);
    throw error;
  }

  return results;
}

/**
 * Reads Excel file and uploads customer records to Firebase (Node.js version)
 * @param {string} filePath - Path to the Excel file
 * @param {Function} createMember - Function to create a member (from context or firebase-crud)
 * @returns {Promise<Object>} - Results object with success/error counts
 */
export async function uploadCustomerRecords(filePath, createMember) {
  if (!createMember || typeof createMember !== 'function') {
    throw new Error('createMember must be a function');
  }
  
  const workbook = new ExcelJS.Workbook();
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Read the Excel file
    await workbook.xlsx.readFile(filePath);

    // Get the first worksheet
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new Error('No worksheet found in the Excel file');
    }

    // console.log(`Processing worksheet: ${worksheet.name}`);
    // console.log(`Total rows: ${worksheet.rowCount}`);

    // Collect all promises to wait for them
    const promises = [];

    // Iterate through rows (starting from row 2 to skip header, adjust if needed)
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      // Skip header row (adjust this if your data starts on a different row)
      if (rowNumber === 1) {
        return;
      }

      const processRow = async () => {
        try {
          results.total++;

          // Extract data from columns
          const name = row.getCell(1).value?.toString().trim() || ''; // Column A
          const idPart1 = row.getCell(2).value?.toString().trim() || ''; // Column B
          const idPart2 = row.getCell(3).value?.toString().trim() || ''; // Column C
          const car = row.getCell(4).value?.toString().trim() || ''; // Column D

          // Concatenate B + C for the ID
          const id = `${idPart1}${idPart2}`;

          // Determine isActive based on gray fill color
          const isActive = !rowHasColor(row, 'gray');

          // Determine validPayment based on yellow fill color
          const validPayment = !rowHasColor(row, 'yellow');

          // Default notes to empty string
          const notes = '';

          // Default email to empty string
          const email = '';

          // Validate that we have at least an ID
          if (!id) {
            console.warn(`Row ${rowNumber}: Skipping - no ID found`);
            results.failed++;
            results.errors.push({
              row: rowNumber,
              error: 'No ID found (columns B + C are empty)',
            });
            return;
          }

        // Log the data being processed
        //   console.log(`Row ${rowNumber}:`, {
        //     id,
        //     name,
        //     car,
        //     isActive,
        //     validPayment,
        //   });

          // Create the member in Firebase
          await createMember(id, name, car, isActive, validPayment, notes, email);

          results.successful++;
        //   console.log(` Row ${rowNumber}: Successfully created member ${id}`);
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            error: error.message,
          });
          console.error(` Row ${rowNumber}: Error creating member - ${error.message}`);
        }
      };

      promises.push(processRow());
    });

    // Wait for all rows to be processed
    await Promise.all(promises);

  } catch (error) {
    console.error('Error reading Excel file:', error);
    throw error;
  }

  return results;
}
