// backend/src/services/extraction/spreadsheetExtractor.js
// Extraction de classeurs .xlsx via exceljs.
// Le .xls binaire (Excel 97-2003) n'est pas pris en charge : exceljs ne le lit
// pas, et le paquet npm `xlsx` qui le ferait traîne des CVE non corrigées.
const ExcelJS = require('exceljs');
const { AppError } = require('../../middleware/errorMiddleware');

// Une feuille très large produirait des lignes illisibles pour le modèle.
const MAX_COLUMNS = 50;
const MAX_ROWS_PER_SHEET = 5000;

/** Rend une cellule en texte, quel que soit son type exceljs. */
function cellToText(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    // Formule : on garde le résultat calculé, pas l'expression.
    if ('result' in value) return cellToText(value.result);
    if ('text' in value) return String(value.text);
    if ('richText' in value) return value.richText.map(part => part.text).join('');
    if ('hyperlink' in value) return String(value.text || value.hyperlink);
    return '';
  }
  return String(value);
}

/**
 * Une feuille devient un bloc titré suivi de lignes tabulées : ce découpage
 * survit bien au chunking RAG, chaque ligne restant lisible isolément.
 */
function sheetToText(sheet) {
  const lines = [];
  let rowCount = 0;

  sheet.eachRow({ includeEmpty: false }, row => {
    if (rowCount >= MAX_ROWS_PER_SHEET) return;
    const cells = [];
    for (let column = 1; column <= Math.min(row.cellCount, MAX_COLUMNS); column += 1) {
      cells.push(cellToText(row.getCell(column).value).trim());
    }
    if (cells.some(Boolean)) {
      lines.push(cells.join('\t'));
      rowCount += 1;
    }
  });

  if (lines.length === 0) return '';
  return `## Feuille : ${sheet.name}\n${lines.join('\n')}`;
}

async function extract(buffer, filename) {
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(buffer);
  } catch (error) {
    console.error('❌ Excel: lecture impossible:', error.message);
    throw new AppError(
      "Ce classeur Excel est illisible. Enregistrez-le au format .xlsx puis réessayez.",
      400,
      { code: 'EXTRACTION_FAILED' }
    );
  }

  const blocks = workbook.worksheets.map(sheetToText).filter(Boolean);

  if (blocks.length === 0) {
    throw new AppError('Ce classeur ne contient aucune donnée exploitable.', 422, {
      code: 'EXTRACTION_EMPTY'
    });
  }

  return {
    content: blocks.join('\n\n'),
    title: null,
    extractionMethod: 'exceljs',
    metadata: {
      originalFileName: filename,
      fileSize: buffer.length,
      sheetCount: workbook.worksheets.length,
      sheetNames: workbook.worksheets.map(sheet => sheet.name)
    }
  };
}

module.exports = { extract, sheetToText, cellToText };
