function buildCanvaPosterBrief(command, manifest) {
  return {
    title: buildCanvaTitle_(command, manifest),
    designType: "poster",
    brand: manifest.brand || manifest.product,
    product: manifest.product,
    offer: command.offer,
    size: command.size,
    cta: command.cta || manifest.defaultCta || "Order today",
    styleNotes: manifest.styleNotes || "",
    assetCategories: Object.keys(manifest.categoryFolders || {}),
    requiredAssets: manifest.assets || {},
    prompt: buildPosterPrompt(command, manifest)
  };
}

function buildCanvaTitle_(command, manifest) {
  return [
    manifest.product || command.product,
    command.offer || "poster",
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmm")
  ].join(" - ");
}
