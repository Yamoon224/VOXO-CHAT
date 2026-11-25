export function catalogSourceUrl(signedUrl, pageNumber) {
  const page = Number(pageNumber)
  return Number.isInteger(page) && page > 0 ? `${signedUrl}#page=${page}` : signedUrl
}
