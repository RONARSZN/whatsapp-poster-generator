function findProductManifest(productName, positionalBody) {
  const cfg = getConfig_();
  const rootId = requireConfigValue_("POSTER_ASSETS_ROOT_FOLDER_ID", cfg.posterAssetsRootFolderId);
  const root = DriveApp.getFolderById(rootId);
  const folders = root.getFolders();
  const target = String(productName || "").toLowerCase();
  const body = normalizeManifestLookupText_(positionalBody || productName);
  let prefixMatch = null;

  while (folders.hasNext()) {
    const folder = folders.next();
    const manifestFile = getFileByName_(folder, "manifest.json");
    if (!manifestFile) {
      continue;
    }

    const manifest = JSON.parse(manifestFile.getBlob().getDataAsString());
    const names = [manifest.product].concat(manifest.aliases || []).map(function (name) {
      return String(name || "").toLowerCase();
    });

    if (names.indexOf(target) !== -1) {
      return { ok: true, folder: folder, manifest: manifest, matchedName: target };
    }

    const matchedName = findManifestNamePrefix_(names, body);
    if (matchedName && (!prefixMatch || matchedName.length > prefixMatch.matchedName.length)) {
      prefixMatch = { ok: true, folder: folder, manifest: manifest, matchedName: matchedName };
    }
  }

  if (prefixMatch) {
    return prefixMatch;
  }

  return { ok: false, error: 'I could not find assets for "' + productName + '".' };
}

function validateManifestAssets(manifest, folder) {
  const assets = manifest.assets || {};
  const categoryFolders = manifest.categoryFolders || {};
  const missing = [];

  Object.keys(categoryFolders).forEach(function (key) {
    if (!getFolderByPath_(folder, categoryFolders[key])) {
      missing.push("category folder " + key + ": " + categoryFolders[key]);
    }
  });

  Object.keys(assets).forEach(function (key) {
    if (!getFileByPath_(folder, assets[key])) {
      missing.push(key + ": " + assets[key]);
    }
  });

  if (missing.length) {
    return {
      ok: false,
      error: "I found " + manifest.product + ", but these files are missing: " + missing.join(", ")
    };
  }

  return { ok: true };
}

function loadSelectedAssets(manifest, folder) {
  const assets = manifest.assets || {};
  return Object.keys(assets).map(function (key) {
    const file = getFileByPath_(folder, assets[key]);
    return {
      role: key,
      name: assets[key],
      blob: file.getBlob()
    };
  });
}

function savePosterToDrive(imageData, command, manifest) {
  const cfg = getConfig_();
  const outputId = requireConfigValue_("OUTPUT_FOLDER_ID", cfg.outputFolderId);
  const folder = DriveApp.getFolderById(outputId);
  const filename = [
    manifest.product || command.product,
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss")
  ].join("-") + ".png";

  const bytes = Utilities.base64Decode(imageData.base64);
  const blob = Utilities.newBlob(bytes, "image/png", filename);
  const file = folder.createFile(blob);

  return {
    fileId: file.getId(),
    name: filename,
    url: file.getUrl(),
    blob: blob
  };
}

function getFileByName_(folder, filename) {
  const files = folder.getFilesByName(filename);
  return files.hasNext() ? files.next() : null;
}

function getFileByPath_(folder, path) {
  const parts = String(path || "").split("/").filter(Boolean);
  if (!parts.length) {
    return null;
  }

  let current = folder;
  for (let i = 0; i < parts.length - 1; i++) {
    current = getChildFolderByName_(current, parts[i]);
    if (!current) {
      return null;
    }
  }

  return getFileByName_(current, parts[parts.length - 1]);
}

function getFolderByPath_(folder, path) {
  const parts = String(path || "").split("/").filter(Boolean);
  let current = folder;

  for (let i = 0; i < parts.length; i++) {
    current = getChildFolderByName_(current, parts[i]);
    if (!current) {
      return null;
    }
  }

  return current;
}

function getChildFolderByName_(folder, name) {
  const folders = folder.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : null;
}

function findManifestNamePrefix_(names, body) {
  let matched = "";
  names.forEach(function(name) {
    const normalized = normalizeManifestLookupText_(name);
    if (!normalized) {
      return;
    }

    if ((body === normalized || body.indexOf(normalized + " ") === 0) && normalized.length > matched.length) {
      matched = normalized;
    }
  });

  return matched;
}

function normalizeManifestLookupText_(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}
