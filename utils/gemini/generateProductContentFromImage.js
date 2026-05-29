const config = require("config");
const {
  STYLE_REFERENCE_PROSE,
  STYLE_REFERENCE_JSON_EN,
} = require("./productContentStyleExample");

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

const PRODUCT_COPY_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "object",
      properties: {
        am: { type: "string" },
        ru: { type: "string" },
        en: { type: "string" },
      },
      required: ["am", "ru", "en"],
    },
    description: {
      type: "object",
      properties: {
        am: { type: "string" },
        ru: { type: "string" },
        en: { type: "string" },
      },
      required: ["am", "ru", "en"],
    },
    keyFeatures: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: {
            type: "object",
            properties: {
              am: { type: "string" },
              ru: { type: "string" },
              en: { type: "string" },
            },
            required: ["am", "ru", "en"],
          },
          value: {
            type: "object",
            properties: {
              am: { type: "string" },
              ru: { type: "string" },
              en: { type: "string" },
            },
            required: ["am", "ru", "en"],
          },
        },
        required: ["label", "value"],
      },
    },
    whatsIncluded: {
      type: "array",
      items: {
        type: "object",
        properties: {
          am: { type: "string" },
          ru: { type: "string" },
          en: { type: "string" },
        },
        required: ["am", "ru", "en"],
      },
    },
    material: {
      type: "object",
      properties: {
        am: { type: "string" },
        ru: { type: "string" },
        en: { type: "string" },
      },
      required: ["am", "ru", "en"],
    },
    poweredBy: {
      type: "object",
      properties: {
        am: { type: "string" },
        ru: { type: "string" },
        en: { type: "string" },
      },
      required: ["am", "ru", "en"],
    },
    size: {
      type: "object",
      properties: {
        length: { type: "number" },
        width: { type: "number" },
        height: { type: "number" },
      },
    },
  },
  required: [
    "name",
    "description",
    "keyFeatures",
    "whatsIncluded",
    "material",
    "poweredBy",
    "size",
  ],
};

const formatLocalized = (value) => {
  if (!value || typeof value !== "object") return null;
  const am = value.am?.trim();
  const ru = value.ru?.trim();
  const en = value.en?.trim();
  if (!am && !ru && !en) return null;
  return { am: am || "", ru: ru || "", en: en || "" };
};

const buildProductHintsBlock = (productHints = {}) => {
  const lines = [];

  const name = formatLocalized(productHints.name);
  if (name) {
    lines.push(
      `Existing product name (use as the basis for the product identity, but NORMALIZE it: each locale must be written in its own language — translate/transliterate into Armenian for am, Russian for ru, English for en whenever the existing text is in the wrong language or empty; keep recognized brand names unchanged): am="${name.am}", ru="${name.ru}", en="${name.en}"`
    );
  }

  if (productHints.brand?.trim()) {
    lines.push(`Brand (if visible or known): ${productHints.brand.trim()}`);
  }

  if (productHints.gender) {
    lines.push(`Target gender: ${productHints.gender}`);
  }

  if (productHints.ageRange) {
    const { from, to } = productHints.ageRange;
    lines.push(
      `Age range: ${from}${to != null ? `–${to}` : "+"} years (mention only if plausible from image)`
    );
  }

  if (productHints.sectionName?.trim()) {
    lines.push(`Store section: ${productHints.sectionName.trim()}`);
  }

  const categories = (productHints.categories || [])
    .map((category) => formatLocalized(category?.name))
    .filter(Boolean)
    .map((category) => `am="${category.am}", ru="${category.ru}", en="${category.en}"`);

  if (categories.length) {
    lines.push(`Categories: ${categories.join(" | ")}`);
  }

  if (!lines.length) return "";

  return [
    "Known product metadata (hints only — still verify everything against the image):",
    ...lines.map((line) => `- ${line}`),
  ].join("\n");
};

const buildPrompt = (productHints = {}) => {
  const hintsBlock = buildProductHintsBlock(productHints);

  return [
    "You are an expert toy catalog copywriter for igrusha.pro (Armenia).",
    "Your job: study the product photo carefully, then write accurate, shopper-friendly product content in Armenian (am), Russian (ru), and English (en).",
    "",
    "PHASE 1 — VISUAL ANALYSIS (do this mentally before writing):",
    "1. Identify the exact product type (doll, car, puzzle, building set, plush, board game, etc.).",
    "2. Note brand/logo, licensed characters, model lines, and text printed on packaging.",
    "3. Count visible main pieces and accessories; distinguish product vs packaging/background.",
    "4. Infer materials (plastic, wood, fabric, metal) only when visually plausible.",
    "5. Check for batteries, motors, remote, charger, or electronic parts.",
    "6. Note colors, size cues, age labels on box, safety marks, and play value.",
    "",
    hintsBlock,
    "",
    "PHASE 2 — MATCH THIS STYLE (mandatory tone and depth):",
    "Below is the GOLD STANDARD for how igrusha.pro product pages should read. Copy this level of detail, warmth, and specificity — adapted to the product in the image.",
    "",
    "--- STYLE REFERENCE (prose) ---",
    STYLE_REFERENCE_PROSE,
    "--- END STYLE REFERENCE ---",
    "",
    "How that maps to JSON fields (English pattern — you must produce equivalent depth in am, ru, AND en):",
    JSON.stringify(STYLE_REFERENCE_JSON_EN, null, 2),
    "",
    "FIELD RULES (same depth as the reference):",
    "- name: A short product title in EACH language. The am field MUST be written in Armenian, the ru field MUST be in Russian, the en field MUST be in English. If the provided name hint (or text on the packaging) is in the wrong language for a locale, TRANSLATE/transliterate it into that locale's language — never leave English text in the am or ru field, or Russian text in the en field. Keep proper brand names as-is.",
    "- description: Exactly 2 rich sentences per language. Opening hooks the parent/child emotionally; second explains interactive/play value. No one-liners.",
    "- keyFeatures: 4–6 items. label = short Title Case feature name (2–5 words). value = one full sentence with concrete detail (frequency, effects, colors, mechanics) when visible.",
    "- whatsIncluded: 4–8 items. Each item is one complete sentence naming the piece + useful detail (function, quantity, size if known). Like a numbered unboxing list.",
    "- poweredBy: Full specification sentence when batteries/mains/USB apply (type, count, what they power, 'not included' if typical). Empty string in all locales if not powered.",
    "- material: One polished phrase per language (e.g. 'High-quality, impact-resistant plastic'), not a single bare noun.",
    "- size: Numeric product dimensions in centimeters as { length, width, height }. Include only the dimensions that are printed on the packaging or can be read/estimated reliably from clear reference cues in the image. Omit any dimension you cannot determine with confidence, and return an empty object {} if none are known — do NOT guess or invent measurements. Output plain numbers only (no units, no text).",
    "",
    "QUALITY RULES:",
    "- am, ru, and en must be equally detailed — do NOT shorten Armenian or Russian.",
    "- Every locale field must be written in its own language (am=Armenian, ru=Russian, en=English). Never mix languages within a field.",
    "- Ground claims in the image and hints. If unsure, use careful wording; never fabricate frequencies, counts, dimensions, or sizes.",
    "- Translations must be natural native-quality — not literal word-for-word.",
    "- Do not mention price, SKU, warranty, or shipping.",
    "- Do not output markdown or emojis; return strict JSON matching the schema only.",
  ].join("\n");
};

const normalizeGeminiModel = (model) => {
  const normalized = String(model || "").trim();
  if (!/^gemini-[\w.-]+$/.test(normalized)) {
    throw new Error(
      `Invalid geminiModel "${model}". Use the API model id (e.g. gemini-3.1-flash-lite), not the display name from AI Studio.`
    );
  }
  return normalized;
};

const buildGenerationConfig = (geminiModel) => {
  const generationConfig = {
    responseMimeType: "application/json",
    temperature: 0.35,
    maxOutputTokens: 4096,
    responseSchema: PRODUCT_COPY_SCHEMA,
  };

  if (/gemini-3|gemini-2\.5/.test(geminiModel)) {
    generationConfig.thinkingConfig = { thinkingLevel: "low" };
  }

  return generationConfig;
};

const generateProductContentFromImage = async (imageUrl, productHints = {}) => {
  const geminiApiKey = config.get("geminiApiKey");
  const geminiModel = normalizeGeminiModel(config.get("geminiModel"));

  if (!geminiApiKey) {
    throw new Error("Gemini API key is not configured.");
  }

  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(
      `Unable to fetch product image: HTTP ${imageResponse.status}`
    );
  }

  const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

  const body = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: contentType.split(";")[0],
              data: imageBuffer.toString("base64"),
            },
          },
          { text: buildPrompt(productHints) },
        ],
      },
    ],
    generationConfig: buildGenerationConfig(geminiModel),
  };

  const response = await fetch(
    `${GEMINI_API_URL}/${geminiModel}:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const rawError = await response.text();
    throw new Error(
      `Gemini request failed: HTTP ${response.status} - ${rawError}`
    );
  }

  const result = await response.json();
  const rawText =
    result?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text ||
    "";

  if (!rawText) throw new Error("Gemini returned an empty response.");

  return JSON.parse(rawText);
};

module.exports = generateProductContentFromImage;
