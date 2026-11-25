const sharp = require('sharp');

function separatorBands(values, minimumWidth) {
  const bands = [];
  let start = null;
  values.forEach((separator, index) => {
    if (separator && start === null) start = index;
    if ((!separator || index === values.length - 1) && start !== null) {
      const end = separator && index === values.length - 1 ? index + 1 : index;
      if (end - start >= minimumWidth) bands.push([start, end]);
      start = null;
    }
  });
  return bands;
}

function contentIntervals(size, bands) {
  const intervals = [];
  let start = 0;
  for (const [left, right] of bands) {
    if (left > start) intervals.push([start, left]);
    start = right;
  }
  if (start < size) intervals.push([start, size]);
  return intervals.filter(([left, right]) => right - left >= size * 0.16);
}

function whitespaceAxes(data, width, height) {
  const columns = new Array(width).fill(0);
  const rows = new Array(height).fill(0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width) + x] < 242) {
        columns[x] += 1;
        rows[y] += 1;
      }
    }
  }
  return {
    columns: columns.map(value => value / height < 0.01),
    rows: rows.map(value => value / width < 0.01),
  };
}

async function split(buffer) {
  const { data, info } = await sharp(buffer).greyscale().raw().toBuffer({ resolveWithObject: true });
  if (info.width < 800 || info.height < 800) return [];
  const axes = whitespaceAxes(data, info.width, info.height);
  const columns = contentIntervals(info.width, separatorBands(axes.columns, Math.ceil(info.width * 0.01)));
  const rows = contentIntervals(info.height, separatorBands(axes.rows, Math.ceil(info.height * 0.01)));
  if (columns.length * rows.length < 2 || columns.length > 5 || rows.length > 8) return [];
  const cells = [];
  for (const [top, bottom] of rows) {
    for (const [left, right] of columns) {
      cells.push(await sharp(buffer).extract({
        left, top, width: right - left, height: bottom - top,
      }).png().toBuffer());
    }
  }
  return cells;
}

module.exports = { split, whitespaceAxes, separatorBands, contentIntervals };
