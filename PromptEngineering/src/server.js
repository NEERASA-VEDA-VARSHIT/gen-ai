import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { getPersona, getPersonaList } from "./personas.js";

const app = express();
const port = process.env.PORT || 3000;
const model = process.env.OPENAI_MODEL || "gemini-3-flash";
const providerBaseUrl =
  process.env.OPENAI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir));

app.get("/api/health", (_, res) => {
  res.json({ ok: true, model });
});

app.get("/api/personas", (_, res) => {
  res.json({ personas: getPersonaList() });
});

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Server is not configured. Please set GEMINI_API_KEY in environment variables."
      });
    }
    const client = new OpenAI({
      apiKey,
      baseURL: providerBaseUrl
    });

    const { personaId, messages } = req.body;
    const persona = getPersona(personaId);

    if (!persona) {
      return res.status(400).json({ error: "Invalid persona selected." });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages are required." });
    }

    const sanitizedMessages = messages
      .filter((msg) => msg && (msg.role === "user" || msg.role === "assistant"))
      .map((msg) => ({
        role: msg.role,
        content: String(msg.content || "").slice(0, 4000)
      }));

    if (sanitizedMessages.length === 0) {
      return res.status(400).json({ error: "No valid messages provided." });
    }

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.7,
      messages: [
        { role: "system", content: persona.systemPrompt },
        ...sanitizedMessages
      ]
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return res.status(502).json({ error: "No response received from AI provider." });
    }

    res.json({
      persona: { id: persona.id, name: persona.name },
      reply
    });
  } catch (error) {
    console.error("Chat provider error:", error?.status, error?.message, error?.error);
    const message = error?.status === 401
      ? "Authentication failed with AI provider. Check API key."
      : "The assistant is temporarily unavailable. Please try again.";

    res.status(500).json({ error: message });
  }
});

app.use((_, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
