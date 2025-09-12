const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

class XLSXService {
  constructor() {
    // Create data directory if it doesn't exist
    this.dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  processXLSXFile(uploadedFile, fileName, calculateNP = false) {
    try {
      // First load the uploaded file to get the data
      let result = this.loadXLSXFile(uploadedFile.path);
      if (result.success) {
        // If calculateNP flag is true, process the data to add NP% column
        let dateColumnIndexes = [];
        if (calculateNP) {
          const dataManipulator = require('./dataManipulator');
          result.data = dataManipulator.calculateNPPercentage(result.data);
          dateColumnIndexes = [15,16];
        }
        
        // Now save the (potentially processed) data to data directory
        const targetPath = path.join(this.dataDir, fileName);
        const saveResult = this.saveDataToXLSXFile(result.data, targetPath, dateColumnIndexes);
        
        if (saveResult.success) {
          // Remove the original uploaded file
          fs.unlinkSync(uploadedFile.path);
          
          console.log(`File processed and saved to data directory: ${fileName}`);
          return {
            success: true,
            data: result.data,
            sheetName: result.sheetName,
            totalRows: result.totalRows,
            filePath: targetPath,
            filename: fileName
          };
        } else {
          return {
            success: false,
            error: 'Failed to save processed data to data directory'
          };
        }
      }
      return result;
    } catch (error) {
      console.error('Error processing XLSX file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Load and parse XLSX file
  loadXLSXFile(filePath) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Read the workbook
      const workbook = XLSX.readFile(filePath);
      
      // Get the first worksheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      return {
        success: true,
        data: jsonData,
        sheetName: sheetName,
        totalRows: jsonData.length
      };
    } catch (error) {
      console.error('Error loading XLSX file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Save uploaded file to data directory
  saveFileToDataDirectory(uploadedFile, filename) {
    try {
      const targetPath = path.join(this.dataDir, filename);
      
      // Copy the uploaded file to data directory
      fs.copyFileSync(uploadedFile.path, targetPath);
      
      // Remove the original uploaded file
      fs.unlinkSync(uploadedFile.path);
      
      console.log(`File saved to data directory: ${filename}`);
      return {
        success: true,
        filePath: targetPath,
        filename: filename
      };
    } catch (error) {
      console.error('Error saving file to data directory:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Load XLSX file from data directory by filename
  loadXLSXFromDataDirectory(filename) {
    const filePath = path.join(this.dataDir, filename);
    return this.loadXLSXFile(filePath);
  }

  saveDataToXLSXFile(data, fileName, dateColumnIndexes = []) {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Process data to handle date formatting for specified columns
      const processedData = this._processDataForDateFormatting(data, dateColumnIndexes);
      
      const worksheet = XLSX.utils.json_to_sheet(processedData);
      
      // Apply date formatting to the specified columns
      if (dateColumnIndexes.length > 0) {
        this._applyDateFormattingToColumns(worksheet, dateColumnIndexes, data.length);
      }
      
      // Use just the basename for sheet name (max 31 chars, no path separators)
      const sheetName = path.basename(fileName, path.extname(fileName)).substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      XLSX.writeFile(workbook, fileName);
      return {
        success: true,
        fileName: fileName
      };
    } catch (error) {
      console.error('Error saving data to XLSX file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Helper method to process data and convert Excel serial dates to Date objects
  _processDataForDateFormatting(data, dateColumnIndexes = []) {
    if (!Array.isArray(data) || data.length === 0 || dateColumnIndexes.length === 0) {
      return data;
    }

    return data.map(row => {
      if (!Array.isArray(row)) {
        return row;
      }

      const processedRow = [...row];

      // Process each specified date column
      dateColumnIndexes.forEach(columnIndex => {
        if (columnIndex < row.length && typeof row[columnIndex] === 'number') {
          // Convert Excel serial date to JavaScript Date
          // Excel serial date (days since 1900-01-01, accounting for leap year bug)
          const date = new Date((row[columnIndex] - 25569) * 86400 * 1000);
          processedRow[columnIndex] = date;
        }
      });

      return processedRow;
    });
  }

  // Helper method to apply date formatting to specified columns
  _applyDateFormattingToColumns(worksheet, dateColumnIndexes, rowCount) {
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    dateColumnIndexes.forEach(columnIndex => {
      // Convert column index to Excel column letter (A, B, C, D, etc.)
      const columnLetter = this._indexToColumnLetter(columnIndex);
      
      // Apply date formatting to each cell in the specified column
      for (let row = range.s.r; row <= Math.min(range.e.r, rowCount); row++) {
        const cellAddress = columnLetter + (row + 1);
        const cell = worksheet[cellAddress];
        
        if (cell && (cell.t === 'n' || cell.t === 'd')) {
          // Apply date number format
          if (!cell.z) {
            cell.z = 'dd/mm/yyyy'; // You can change this format as needed
          }
          
        }
      }
    });
  }

  // Helper method to convert column index to Excel column letter
  _indexToColumnLetter(index) {
    let columnLetter = '';
    let columnNumber = index + 1; // Excel columns are 1-based
    
    while (columnNumber > 0) {
      columnNumber--;
      columnLetter = String.fromCharCode(65 + (columnNumber % 26)) + columnLetter;
      columnNumber = Math.floor(columnNumber / 26);
    }
    
    return columnLetter;
  }

}

module.exports = new XLSXService();
