import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { open } from "sqlite";
import sqlite3 from "sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "../..");
const distDir = path.join(appRoot, "dist");
const dataDir = path.join(appRoot, "data");
const databasePath = path.join(dataDir, "vocab.db");
const port = Number.parseInt(process.env.PORT ?? "3120", 10) || 3120;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const EXTRACT_TIMEOUT_MS = 30_000;

fs.mkdirSync(dataDir, { recursive: true });

const db = await open({
  filename: databasePath,
  driver: sqlite3.Database,
});

await db.exec(`
  CREATE TABLE IF NOT EXISTS vocabulary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    term TEXT NOT NULL,
    definition TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const app = express();

app.use(express.json({ limit: "6mb" }));

app.get("/health", async (_req, res) => {
  const row = await db.get("SELECT COUNT(*) AS count FROM vocabulary");
  res.json({
    status: "ok",
    app: "vokabeltest-app3",
    storage: "sqlite",
    items: row.count,
  });
});

app.get("/api/vocab", async (_req, res) => {
  const items = await db.all(
    "SELECT id, term, definition, source, created_at FROM vocabulary ORDER BY id DESC",
  );
  res.json({ items });
});

app.post("/api/vocab", async (req, res) => {
  const parsed = parseVocabularyEntry(req.body);
  if (!parsed.ok) {
    return res.status(400).json({ error: parsed.error });
  }

  const result = await db.run(
    "INSERT INTO vocabulary (term, definition, source) VALUES (?, ?, ?)",
    parsed.value.term,
    parsed.value.definition,
    parsed.value.source,
  );
  const item = await db.get(
    "SELECT id, term, definition, source, created_at FROM vocabulary WHERE id = ?",
    result.lastID,
  );

  return res.status(201).json({ item });
});

app.put("/api/vocab/:id", async (req, res) => {
  const parsed = parseVocabularyEntry(req.body);
  if (!parsed.ok) {
    return res.status(400).json({ error: parsed.error });
  }

  const itemId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(itemId)) {
    return res.status(400).json({ error: "Invalid vocabulary id." });
  }

  const result = await db.run(
    "UPDATE vocabulary SET term = ?, definition = ?, source = ? WHERE id = ?",
    parsed.value.term,
    parsed.value.definition,
    parsed.value.source,
    itemId,
  );

  if (result.changes === 0) {
    return res.status(404).json({ error: "Vocabulary entry not found." });
  }

  const item = await db.get(
    "SELECT id, term, definition, source, created_at FROM vocabulary WHERE id = ?",
    itemId,
  );

  return res.json({ item });
});

app.delete("/api/vocab/:id", async (req, res) => {
  const itemId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(itemId)) {
    return res.status(400).json({ error: "Invalid vocabulary id." });
  }

  const result = await db.run("DELETE FROM vocabulary WHERE id = ?", itemId);

  if (result.changes === 0) {
    return res.status(404).json({ error: "Vocabulary entry not found." });
  }

  return res.json({ message: "Vocabulary entry deleted." });
});

app.get("/api/test/random", async (_req, res) => {
  const item = await db.get(
    "SELECT id, term, definition, source, created_at FROM vocabulary ORDER BY RANDOM() LIMIT 1",
  );

  if (!item) {
    return res.status(404).json({ error: "No vocabulary available for quiz mode." });
  }

  return res.json({ item });
});

app.post("/api/extract", async (req, res) => {
  const payload = req.body;
  const validation = validateExtractPayload(payload);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EXTRACT_TIMEOUT_MS);

  try {
    const items = await extractVocabularyWithProvider(validation.value, controller.signal);

    if (items.length === 0) {
      return res.status(422).json({ error: "No vocabulary found in provider response." });
    }

    const inserted = [];

    for (const item of items) {
      const result = await db.run(
        "INSERT INTO vocabulary (term, definition, source) VALUES (?, ?, ?)",
        item.term,
        item.definition,
        `${validation.value.provider}:${validation.value.filename}`,
      );
      inserted.push({
        id: result.lastID,
        ...item,
        source: `${validation.value.provider}:${validation.value.filename}`,
      });
    }

    return res.status(201).json({ items: inserted });
  } catch (error) {
    if (error?.name === "AbortError") {
      return res.status(504).json({ error: "Provider request timeout (30s)" });
    }

    return res.status(502).json({
      error: error.message || "Provider request failed.",
    });
  } finally {
    clearTimeout(timeoutId);
  }
});

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, { extensions: ["html"] }));
  app.get(/^\/(?!api\/|health$).*/, (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`vokabeltest-app3 listening on port ${port}`);
});

function parseVocabularyEntry(body) {
  if (!isObject(body)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const term = String(body.term ?? "").trim();
  const definition = String(body.definition ?? "").trim();
  const source = String(body.source ?? "manual").trim() || "manual";

  if (!term) {
    return { ok: false, error: "term is required." };
  }

  if (!definition) {
    return { ok: false, error: "definition is required." };
  }

  return {
    ok: true,
    value: { term, definition, source },
  };
}

function validateExtractPayload(body) {
  if (!isObject(body)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const provider = String(body.provider ?? "").trim().toLowerCase();
  const apiKey = String(body.apiKey ?? "").trim();
  const filename = String(body.filename ?? "upload").trim() || "upload";
  const mimeType = String(body.mimeType ?? "image/jpeg").trim() || "image/jpeg";
  const imageBase64 = String(body.imageBase64 ?? "").trim();

  if (!["openai", "claude", "gemini"].includes(provider)) {
    return { ok: false, error: "provider must be one of openai, claude, or gemini." };
  }

  if (!apiKey) {
    return { ok: false, error: "apiKey is required." };
  }

  if (!imageBase64) {
    return { ok: false, error: "imageBase64 is required." };
  }

  if (!mimeType.startsWith("image/")) {
    return { ok: false, error: "mimeType must describe an image upload." };
  }

  const imageBytes = Buffer.byteLength(imageBase64, "base64");
  if (imageBytes > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "Image upload exceeds the 4 MB limit." };
  }

  return {
    ok: true,
    value: { provider, apiKey, filename, mimeType, imageBase64 },
  };
}

async function extractVocabularyWithProvider({ provider, apiKey, mimeType, imageBase64 }, signal) {
  const prompt =
    "Extract English vocabulary from this textbook page. Return only JSON as an array of objects with term and definition.";

  if (provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              {
                type: "input_image",
                image_url: `data:${mimeType};base64,${imageBase64}`,
              },
            ],
          },
        ],
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "OpenAI request failed.");
    }
    return parseProviderJson(extractTextFromOpenAi(data));
  }

  if (provider === "claude") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "Claude request failed.");
    }
    return parseProviderJson(
      data.content?.find((item) => item.type === "text")?.text ?? "[]",
    );
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
      }),
    },
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Gemini request failed.");
  }
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "[]";
  return parseProviderJson(text);
}

function extractTextFromOpenAi(payload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  const chunks = payload.output ?? [];
  const collected = [];
  for (const chunk of chunks) {
    for (const content of chunk.content ?? []) {
      if (typeof content.text === "string") {
        collected.push(content.text);
      }
    }
  }
  return collected.join("\n");
}

function parseProviderJson(text) {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error("Provider response is not a JSON array.");
  }

  return parsed
    .map((item) => ({
      term: String(item.term ?? "").trim(),
      definition: String(item.definition ?? "").trim(),
    }))
    .filter((item) => item.term && item.definition);
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

app.use((error, _req, res, next) => {
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ error: "Image upload exceeds the 4 MB limit." });
  }

  return next(error);
});
