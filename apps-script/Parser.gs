function parsePosterCommand(text) {
  const raw = String(text || "").trim();
  if (!raw.toLowerCase().startsWith("poster")) {
    return {
      ok: false,
      error: "Use: poster product offer size. Example: poster coffee 20% off portrait"
    };
  }

  const body = raw.replace(/^poster\s*/i, "").trim();
  const kv = parseKeyValueArgs_(body);
  const positionalBody = stripKeyValueArgs_(body);
  const tokens = positionalBody.split(/\s+/).filter(Boolean);

  const product = kv.product || findProductToken_(tokens) || "";
  const size = normalizeSize_(kv.size || findSizeToken_(tokens) || "portrait");
  const mode = normalizeMode_(kv.mode || "canva");
  const style = kv.style || "default";
  const cta = kv.cta || "Order today";
  const pegNotes = kv.peg || kv.pegnotes || kv.inspo || "";
  const offer = kv.offer || inferOffer_(tokens);

  if (!product) {
    return { ok: false, error: "Missing product. Example: poster coffee 20% off portrait" };
  }

  if (!mode) {
    return { ok: false, error: "Invalid mode. Use mode=canva, mode=openai or mode=local." };
  }

  return {
    ok: true,
    data: {
      product: product.toLowerCase(),
      offer: offer || "Special offer",
      size: size,
      mode: mode,
      style: style,
      cta: cta,
      pegNotes: pegNotes,
      rawText: raw
    }
  };
}

function parseKeyValueArgs_(body) {
  const result = {};
  const regex = /(\w+)=("[^"]+"|'[^']+'|[^\s]+)/g;
  let match;
  while ((match = regex.exec(body)) !== null) {
    result[match[1].toLowerCase()] = String(match[2]).replace(/^["']|["']$/g, "");
  }
  return result;
}

function stripKeyValueArgs_(body) {
  return String(body || "").replace(/(\w+)=("[^"]+"|'[^']+'|[^\s]+)/g, "").trim();
}

function inferOffer_(tokens) {
  const sizeWords = { square: true, portrait: true, story: true, landscape: true };
  return tokens.slice(1).filter(function (token) {
    return !sizeWords[token.toLowerCase()] && !/^\w+=/.test(token);
  }).join(" ").trim();
}

function findSizeToken_(tokens) {
  const sizes = { square: true, portrait: true, story: true, landscape: true };
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].toLowerCase();
    if (sizes[token]) {
      return token;
    }
  }
  return "";
}

function findProductToken_(tokens) {
  const sizes = { square: true, portrait: true, story: true, landscape: true };
  for (let i = 0; i < tokens.length; i++) {
    const token = String(tokens[i] || "");
    const normalized = token.toLowerCase();
    if (!sizes[normalized] && !/^\w+=/.test(token)) {
      return token;
    }
  }
  return "";
}

function normalizeSize_(size) {
  const value = String(size || "").toLowerCase();
  if (value === "square") return "1024x1024";
  if (value === "landscape") return "1536x1024";
  return "1024x1536";
}

function normalizeMode_(mode) {
  const value = String(mode || "").toLowerCase();
  if (value === "canva") return "canva";
  if (value === "openai" || value === "image") return "openai";
  if (value === "local" || value === "test") return "local";
  return "";
}
