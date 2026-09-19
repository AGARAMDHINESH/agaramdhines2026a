import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString() 
    });
  });

  // Tamil Asan AI Chatbot API Endpoint
  app.post("/api/tamil-asan", async (req, res) => {
    try {
      const { 
        parts, 
        systemInstruction, 
        temperature = 0.3,
        model = "gemini-3.8-flash"
      } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(401).json({
          error: "GEMINI_API_KEY is not configured on the server. Please add your key in AI Studio Settings > Secrets."
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          systemInstruction,
          temperature,
        }
      });

      const text = response.text || "";
      return res.json({ text, success: true });
    } catch (err: any) {
      console.error("Server /api/tamil-asan error:", err);
      const isLeakedKey = err?.message?.includes("leaked") || err?.status === 403;
      const isQuota = err?.message?.includes("quota") || err?.status === 429;

      let userFriendlyMessage = err?.message || "Internal server error";
      if (isLeakedKey) {
        userFriendlyMessage = "API Key reported as leaked by Google. Please update GEMINI_API_KEY in Settings > Secrets.";
      } else if (isQuota) {
        userFriendlyMessage = "API Quota exceeded. Please check your Gemini API quota.";
      }

      return res.status(err?.status || 500).json({
        error: userFriendlyMessage,
        isLeakedKey,
        isQuota,
        rawError: err?.message
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
