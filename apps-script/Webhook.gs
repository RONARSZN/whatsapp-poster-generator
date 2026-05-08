function verifyWebhook(e) {
  const cfg = getConfig_();
  const mode = e && e.parameter && e.parameter["hub.mode"];
  const token = e && e.parameter && e.parameter["hub.verify_token"];
  const challenge = e && e.parameter && e.parameter["hub.challenge"];

  if (mode === "subscribe" && token === cfg.whatsappVerifyToken) {
    return ContentService.createTextOutput(challenge);
  }

  return ContentService.createTextOutput("Forbidden").setMimeType(ContentService.MimeType.TEXT);
}

function extractWhatsAppMessage_(payload) {
  const value = payload &&
    payload.entry &&
    payload.entry[0] &&
    payload.entry[0].changes &&
    payload.entry[0].changes[0] &&
    payload.entry[0].changes[0].value;

  const msg = value && value.messages && value.messages[0];
  if (!msg || msg.type !== "text") {
    return null;
  }

  return {
    id: msg.id,
    from: msg.from,
    text: msg.text && msg.text.body ? msg.text.body : ""
  };
}

function isAllowedSender_(sender) {
  const allowedUsers = parseAllowedUsers_(getConfig_().allowedUsers);
  if (!allowedUsers.length) {
    return true;
  }

  const normalizedSender = normalizePhoneNumber_(sender);
  return allowedUsers.indexOf(normalizedSender) !== -1;
}

function parseAllowedUsers_(value) {
  if (!value) {
    return [];
  }

  return value
    .split(/[\n,]+/)
    .map(normalizePhoneNumber_)
    .filter(function(number) {
      return number;
    });
}

function normalizePhoneNumber_(value) {
  if (!value) {
    return "";
  }

  const raw = String(value).trim();
  if (!raw) {
    return "";
  }

  const cleaned = raw.replace(/[^\d+]/g, "");
  return cleaned.charAt(0) === "+" ? cleaned : "+" + cleaned;
}

function isDuplicateMessage_(messageId) {
  if (!messageId) {
    return false;
  }

  const cache = CacheService.getScriptCache();
  const key = "wa_msg_" + messageId;
  if (cache.get(key)) {
    return true;
  }

  cache.put(key, "1", 21600);
  return false;
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseJson_(text) {
  if (!text) {
    throw new Error("Empty request body.");
  }
  return JSON.parse(text);
}
