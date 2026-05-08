function sendWhatsAppText(to, message) {
  return sendWhatsAppPayload_({
    messaging_product: "whatsapp",
    to: to,
    type: "text",
    text: { body: message }
  });
}

function sendWhatsAppImage(to, savedFile) {
  return sendWhatsAppPayload_({
    messaging_product: "whatsapp",
    to: to,
    type: "image",
    image: {
      link: savedFile.url,
      caption: "Generated poster"
    }
  });
}

function sendWhatsAppPayload_(payload) {
  const cfg = getConfig_();
  const token = requireConfigValue_("WHATSAPP_ACCESS_TOKEN", cfg.whatsappAccessToken);
  const phoneId = requireConfigValue_("WHATSAPP_PHONE_NUMBER_ID", cfg.whatsappPhoneNumberId);
  const url = "https://graph.facebook.com/v21.0/" + phoneId + "/messages";

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + token },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error("WhatsApp send failed: " + response.getContentText());
  }

  return JSON.parse(response.getContentText());
}

