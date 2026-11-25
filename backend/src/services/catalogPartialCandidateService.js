function hasUsefulData(candidate = {}) {
  return Boolean(
    candidate.title || candidate.sku || candidate.priceAmount != null
    || candidate.description || candidate.specifications?.length
  );
}

function provisionalTitle(pageNumber, index) {
  return `Produit à vérifier — page ${pageNumber || 1} — n°${index + 1}`;
}

function missingFields(candidate = {}, hasAsset = Boolean(candidate.assetBuffer)) {
  return [
    !candidate.title && 'title',
    !candidate.sku && 'sku',
    candidate.priceAmount == null && 'price',
    !candidate.priceCurrency && 'currency',
    !candidate.description && 'description',
    !candidate.specifications?.length && 'specifications',
    !hasAsset && 'image',
  ].filter(Boolean);
}

function prepareCandidates(candidates = []) {
  return candidates.filter(hasUsefulData).map((candidate, index) => {
    const generatedTitle = Boolean(candidate.provisionalTitle || !candidate.title);
    const prepared = {
      ...candidate,
      title: candidate.title || provisionalTitle(candidate.pageNumber, index),
      provisionalTitle: generatedTitle,
    };
    prepared.missingFields = candidate.missingFields || missingFields(candidate);
    prepared.reviewRequired = Boolean(
      candidate.reviewRequired || generatedTitle || !candidate.assetBuffer
      || candidate.priceAmount == null || !candidate.priceCurrency
    );
    return prepared;
  });
}

module.exports = { hasUsefulData, provisionalTitle, missingFields, prepareCandidates };
