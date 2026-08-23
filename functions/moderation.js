const MODEL = "gemini-3.6-flash";

const PROMPT = `You are a content moderator for Reloop, a secondhand clothing and fashion accessories marketplace. Review the listing below (title, description, and photos) and answer two separate questions.

Layer 1 — Safety: Does any of this content depict or promote sexual content, graphic violence, hate symbols/speech, self-harm, or anything else unsafe for a general audience?

Layer 2 — Marketplace fit: Even if it's safe, is this actually an appropriate item for a SECONDHAND CLOTHING marketplace? Allowed: clothing, shoes, bags, jewelry, and fashion accessories, in any condition. NOT allowed, even though they aren't "unsafe" images on their own: weapons (knives, guns, etc.), medication or drugs, alcohol, vehicles, electronics, furniture, or anything else that isn't a wearable fashion item.

Listing title: {{TITLE}}
Listing description: {{DESCRIPTION}}

Respond with JSON only, matching this exact shape:
{"safe": boolean, "appropriate": boolean, "reason": "one short plain-language sentence explaining the decision — this may be shown directly to the person listing the item if rejected"}`;

async function imageToInlinePart(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't fetch image for moderation (${res.status})`);
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  return {
    inlineData: {
      mimeType: contentType,
      data: buffer.toString("base64"),
    },
  };
}

/**
 * Checks a listing's title, description, and photos against two layers:
 * general safety, and whether it's actually an appropriate item for a
 * clothing marketplace. Returns { safe, appropriate, reason }.
 *
 * If apiKey is missing, moderation is skipped (fails open) rather than
 * blocking listing creation entirely — see README for how to flip this
 * to fail-closed if you'd rather block listings when the check can't run.
 */
async function moderateListing({ title, description, images, apiKey }) {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not set — skipping content moderation.");
    return { safe: true, appropriate: true, reason: "Moderation skipped (no API key configured)." };
  }

  const imageParts = await Promise.all(images.slice(0, 5).map(imageToInlinePart));
  const prompt = PROMPT.replace("{{TITLE}}", title || "(no title)").replace(
    "{{DESCRIPTION}}",
    description || "(no description)"
  );

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }, ...imageParts],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          safe: { type: "BOOLEAN" },
          appropriate: { type: "BOOLEAN" },
          reason: { type: "STRING" },
        },
        required: ["safe", "appropriate", "reason"],
      },
    },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Moderation API error (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Moderation API returned an empty response.");

  const parsed = JSON.parse(text);
  return {
    safe: Boolean(parsed.safe),
    appropriate: Boolean(parsed.appropriate),
    reason: String(parsed.reason || ""),
  };
}

module.exports = { moderateListing };
