const WINDOWS_1252_BYTES = new Map([
  ['€', 0x80], ['‚', 0x82], ['ƒ', 0x83], ['„', 0x84], ['…', 0x85],
  ['†', 0x86], ['‡', 0x87], ['ˆ', 0x88], ['‰', 0x89], ['Š', 0x8a],
  ['‹', 0x8b], ['Œ', 0x8c], ['Ž', 0x8e], ['‘', 0x91], ['’', 0x92],
  ['“', 0x93], ['”', 0x94], ['•', 0x95], ['–', 0x96], ['—', 0x97],
  ['˜', 0x98], ['™', 0x99], ['š', 0x9a], ['›', 0x9b], ['œ', 0x9c],
  ['ž', 0x9e], ['Ÿ', 0x9f],
]);

const MOJIBAKE_MARKERS = /(?:Ã.|Â.|â..|ð..|ï..)/gu;

function corruptionScore(value) {
  return (String(value).match(MOJIBAKE_MARKERS) || []).length;
}

function windows1252Bytes(value) {
  const bytes = [];
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (WINDOWS_1252_BYTES.has(character)) bytes.push(WINDOWS_1252_BYTES.get(character));
    else if (codePoint <= 0xff) bytes.push(codePoint);
    else return null;
  }
  return Buffer.from(bytes);
}

function decodeOnce(value) {
  const bytes = windows1252Bytes(value);
  if (!bytes) return value;
  const decoded = bytes.toString('utf8');
  if (decoded.includes('\uFFFD')) return value;
  return corruptionScore(decoded) < corruptionScore(value) ? decoded : value;
}

function normalizeFilenameEncoding(value) {
  let normalized = String(value ?? '').normalize('NFC');
  for (let pass = 0; pass < 2; pass += 1) {
    const decoded = decodeOnce(normalized);
    if (decoded === normalized) break;
    normalized = decoded.normalize('NFC');
  }
  return normalized;
}

module.exports = { normalizeFilenameEncoding, corruptionScore };
