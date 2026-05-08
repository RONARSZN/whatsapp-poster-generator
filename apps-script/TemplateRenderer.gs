function generatePosterWithTemplate(command, manifest, folder) {
  const title = [
    manifest.product || command.product,
    "prototype",
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss")
  ].join(" - ");

  const presentation = SlidesApp.create(title);
  const presentationId = presentation.getId();

  try {
    const slide = presentation.getSlides()[0];
    const slideObjectId = slide.getObjectId();
    const pageWidth = presentation.getPageWidth();
    const pageHeight = presentation.getPageHeight();
    const colors = getTemplateColors_(manifest);

    slide.getBackground().setSolidFill(colors.background);
    drawTemplatePoster_(slide, pageWidth, pageHeight, command, manifest, folder, colors);

    presentation.saveAndClose();
    Utilities.sleep(1200);

    const blob = exportSlideAsPng_(presentationId, slideObjectId);
    return { blob: blob };
  } finally {
    DriveApp.getFileById(presentationId).setTrashed(true);
  }
}

function drawTemplatePoster_(slide, pageWidth, pageHeight, command, manifest, folder, colors) {
  addBlock_(slide, 0, 0, pageWidth, pageHeight, colors.background);
  addBlock_(slide, 0, 0, pageWidth, 84, colors.accent);
  addBlock_(slide, 0, pageHeight - 86, pageWidth, 86, colors.accent);

  const hero = getTemplateHeroBlob_(manifest, folder);
  if (hero) {
    const image = slide.insertImage(hero, pageWidth * 0.54, 108, pageWidth * 0.38, pageHeight * 0.48);
    image.setRotation(0);
  } else {
    addBlock_(slide, pageWidth * 0.56, 118, pageWidth * 0.34, pageHeight * 0.42, colors.panel);
  }

  addText_(slide, String(manifest.brand || manifest.product || "").toUpperCase(), 48, 28, pageWidth - 96, 28, {
    size: 14,
    color: colors.text,
    bold: true
  });

  addText_(slide, buildTemplateHeadline_(command, manifest), 48, 118, pageWidth * 0.48, 130, {
    size: 42,
    color: colors.text,
    bold: true
  });

  addText_(slide, command.offer, 52, 262, pageWidth * 0.44, 62, {
    size: 24,
    color: colors.muted,
    bold: true
  });

  addText_(slide, command.cta || manifest.defaultCta || "Order today", 48, pageHeight - 62, pageWidth - 96, 34, {
    size: 22,
    color: colors.text,
    bold: true
  });
}

function addBlock_(slide, left, top, width, height, color) {
  const block = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, left, top, width, height);
  block.getFill().setSolidFill(color);
  block.getBorder().getLineFill().setSolidFill(color);
  return block;
}

function addText_(slide, text, left, top, width, height, options) {
  const box = slide.insertTextBox(String(text || ""), left, top, width, height);
  const style = box.getText().getTextStyle();
  style.setFontFamily("Arial");
  style.setFontSize(options.size || 18);
  style.setForegroundColor(options.color || "#FFFFFF");
  style.setBold(Boolean(options.bold));
  box.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.LEFT);
  return box;
}

function buildTemplateHeadline_(command, manifest) {
  const offer = String(command.offer || "").toUpperCase();
  const product = String(manifest.product || command.product || "").toUpperCase();
  return offer ? offer + "\n" + product : product;
}

function getTemplateHeroBlob_(manifest, folder) {
  const assets = manifest.assets || {};
  const preferred = assets.hero || assets.gear || assets.menu || assets.background || "";
  if (!preferred) {
    return null;
  }

  const file = getFileByPath_(folder, preferred);
  return file ? file.getBlob() : null;
}

function getTemplateColors_(manifest) {
  const product = String(manifest.product || "").toLowerCase();
  if (product.indexOf("wake") !== -1) {
    return { background: "#101820", accent: "#00A6A6", panel: "#1F2A33", text: "#FFFFFF", muted: "#C8F7F4" };
  }
  if (product.indexOf("pro") !== -1) {
    return { background: "#111111", accent: "#E5E5E5", panel: "#2B2B2B", text: "#FFFFFF", muted: "#D6D6D6" };
  }
  if (product.indexOf("ayo") !== -1 || product.indexOf("messhall") !== -1) {
    return { background: "#1E1A16", accent: "#D89C45", panel: "#352A21", text: "#FFFFFF", muted: "#F5D6A1" };
  }
  return { background: "#121212", accent: "#2F80ED", panel: "#242424", text: "#FFFFFF", muted: "#D8E7FF" };
}

function exportSlideAsPng_(presentationId, slideObjectId) {
  const url = "https://docs.google.com/presentation/d/" + presentationId + "/export/png?id=" + presentationId + "&pageid=" + slideObjectId;
  const response = UrlFetchApp.fetch(url, {
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error("Template poster export failed (" + status + "): " + response.getContentText().slice(0, 500));
  }

  return response.getBlob();
}
