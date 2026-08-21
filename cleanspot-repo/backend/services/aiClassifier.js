// Classifies an uploaded photo into one of the report categories.
//
// AI_PROVIDER=mock (default) — returns a plausible result instantly, no
//   external calls, so the API works fully offline for demos/dev.
// AI_PROVIDER=claude — sends the photo to Claude's vision API and asks it to
//   classify it into one of the categories below. Requires ANTHROPIC_API_KEY.
// AI_PROVIDER=http — forwards the image to any other external computer-vision
//   API at AI_API_URL. Swap this in for a custom-trained model if you have one.
//
// Whichever provider runs, the caller gets back the same shape:
//   { detectedCategory, confidence, matchesUserCategory, provider }

const fs = require("fs");
const path = require("path");

const CATEGORIES = [
  "Garbage accumulation",
  "Overflowing dustbin",
  "Dirty toilet",
  "Plastic waste",
  "Dirty water",
  "Bad smell",
  "Damaged sanitation facility",
  "Other hygiene problem",
];

async function mockClassify(_imagePath, userCategory) {
  // Biased mock: most of the time "detects" whatever the user selected
  // (simulating a reasonably accurate model), occasionally disagrees so the
  // "AI assists, doesn't decide" verification step has something to show.
  const agrees = Math.random() < 0.8;
  const detectedCategory = agrees
    ? userCategory
    : CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const confidence = agrees
    ? 82 + Math.floor(Math.random() * 16) // 82-97
    : 45 + Math.floor(Math.random() * 25); // 45-69

  return {
    detectedCategory,
    confidence,
    matchesUserCategory: detectedCategory === userCategory,
    provider: "mock",
  };
}

const MEDIA_TYPE_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function mediaTypeFor(imagePath) {
  return MEDIA_TYPE_BY_EXT[path.extname(imagePath).toLowerCase()] || "image/jpeg";
}

// Strips ```json fences etc. in case the model wraps its output despite being told not to.
function extractJson(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in Claude's response.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function claudeClassify(imagePath, userCategory) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[aiClassifier] AI_PROVIDER=claude but ANTHROPIC_API_KEY is not set, falling back to mock.");
    return mockClassify(imagePath, userCategory);
  }

  const fetchFn = global.fetch; // Node 18+ has global fetch
  const imageBase64 = fs.readFileSync(imagePath).toString("base64");
  const mediaType = mediaTypeFor(imagePath);
  const model = process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001";

  const prompt = `You are a cleanliness-inspection assistant for a tourist-spot monitoring app.
Look at the attached photo and classify the visible cleanliness/hygiene problem into exactly
one of these categories: ${CATEGORIES.join(", ")}.

The tourist who took this photo labeled it as: "${userCategory}".

Respond with ONLY a JSON object, no other text, no markdown fences, in this exact shape:
{"detectedCategory": "<one of the categories above, verbatim>", "confidence": <integer 0-100>, "reasoning": "<one short sentence>"}

If the photo doesn't clearly show a cleanliness problem, or shows something unrelated, use
"Other hygiene problem" with a low confidence score instead of guessing.`;

  const res = await fetchFn("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Claude API returned ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const textBlock = (data.content || []).find((b) => b.type === "text");
  if (!textBlock) throw new Error("Claude's response contained no text block to parse.");

  const parsed = extractJson(textBlock.text);
  const detectedCategory = CATEGORIES.includes(parsed.detectedCategory)
    ? parsed.detectedCategory
    : "Other hygiene problem";
  const confidence = Math.max(0, Math.min(100, Math.round(Number(parsed.confidence) || 0)));

  return {
    detectedCategory,
    confidence,
    matchesUserCategory: detectedCategory === userCategory,
    provider: "claude",
    reasoning: parsed.reasoning || "",
  };
}

async function httpClassify(imagePath, userCategory) {
  const url = process.env.AI_API_URL;
  const apiKey = process.env.AI_API_KEY;
  if (!url) {
    console.warn("[aiClassifier] AI_PROVIDER=http but AI_API_URL is not set, falling back to mock.");
    return mockClassify(imagePath, userCategory);
  }

  const FormData = require("form-data"); // npm install form-data if you enable this path
  const fetchFn = global.fetch || require("node-fetch"); // Node 18+ has global fetch

  const form = new FormData();
  form.append("image", fs.createReadStream(imagePath));

  const res = await fetchFn(url, {
    method: "POST",
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    body: form,
  });

  if (!res.ok) {
    throw new Error(`AI classification API returned ${res.status}`);
  }

  const data = await res.json();
  // Adapt this mapping to whatever shape your chosen CV API actually returns.
  return {
    detectedCategory: data.label || data.category || "Other hygiene problem",
    confidence: Math.round(data.confidence ?? data.score * 100 ?? 0),
    matchesUserCategory: (data.label || data.category) === userCategory,
    provider: "http",
  };
}

async function classifyImage(imagePath, userCategory) {
  const provider = process.env.AI_PROVIDER || "mock";
  try {
    if (provider === "claude") return await claudeClassify(imagePath, userCategory);
    if (provider === "http") return await httpClassify(imagePath, userCategory);
    return await mockClassify(imagePath, userCategory);
  } catch (err) {
    // Never let a flaky AI provider block a report from being filed — fall back
    // to the mock so the report still goes through, and log loudly so it's
    // obvious in the server console that the real classifier failed.
    console.error(`[aiClassifier] ${provider} classification failed, falling back to mock:`, err.message);
    const fallback = await mockClassify(imagePath, userCategory);
    return { ...fallback, provider: `${provider}-fallback-mock` };
  }
}

module.exports = { classifyImage, CATEGORIES };
