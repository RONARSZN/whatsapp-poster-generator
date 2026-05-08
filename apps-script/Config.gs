function getConfig_() {
  const props = PropertiesService.getScriptProperties();
  return {
    openAiApiKey: props.getProperty("OPENAI_API_KEY"),
    whatsappAccessToken: props.getProperty("WHATSAPP_ACCESS_TOKEN"),
    whatsappPhoneNumberId: props.getProperty("WHATSAPP_PHONE_NUMBER_ID"),
    whatsappVerifyToken: props.getProperty("WHATSAPP_VERIFY_TOKEN"),
    posterAssetsRootFolderId: props.getProperty("POSTER_ASSETS_ROOT_FOLDER_ID"),
    outputFolderId: props.getProperty("OUTPUT_FOLDER_ID"),
    allowedUsers: props.getProperty("ALLOWED_USERS") || props.getProperty("ALLOWED_SENDER_NUMBER"),
    openAiImageModel: props.getProperty("OPENAI_IMAGE_MODEL") || "gpt-image-1-mini",
    defaultQuality: props.getProperty("DEFAULT_IMAGE_QUALITY") || "low"
  };
}

function requireConfigValue_(name, value) {
  if (!value) {
    throw new Error("Missing script property: " + name);
  }
  return value;
}
