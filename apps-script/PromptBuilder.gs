function buildPosterPrompt(command, manifest) {
  const headline = buildHeadline_(command, manifest);
  return [
    "Create a promotional poster.",
    "",
    "Brand: " + (manifest.brand || manifest.product),
    "Product: " + manifest.product,
    "Offer: " + command.offer,
    "Format: " + command.size,
    "Style: " + ((command.style && command.style !== "default") ? command.style : manifest.styleNotes),
    "Available asset categories: " + Object.keys(manifest.categoryFolders || {}).join(", "),
    "Headline: " + headline,
    "CTA: " + (command.cta || manifest.defaultCta || "Order today"),
    "",
    "Use the provided brand and product assets.",
    "Keep all poster text readable.",
    "Do not invent extra brand names.",
    "Do not add unreadable small text."
  ].join("\n");
}

function buildHeadline_(command, manifest) {
  const product = String(manifest.product || command.product || "").toUpperCase();
  const offer = String(command.offer || "").toUpperCase();
  return offer ? offer + " " + product : product;
}
