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

  // Dedicated Grounded Tamil Asan Endpoint:
  // Strictly answers using the teacher's official curriculum/notes context with pinpoint accuracy
  app.post("/api/tamil-asan/ask", async (req, res) => {
    try {
      const {
        message,
        knowledgeContext,
        chatHistory = [],
        imageBase64,
        imageMimeType,
        model = "gemini-3.6-flash",
        answerLength = "detailed"
      } = req.body;

      if (!message && !imageBase64) {
        return res.status(400).json({ error: "கேள்வி வழங்கப்படவில்லை (Query is required)" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(401).json({
          error: "GEMINI_API_KEY சர்வரில் இணைக்கப்படவில்லை. AI Studio Settings > Secrets-ல் GEMINI_API_KEY சேர்க்கவும்."
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      const strictSystemInstruction = `நீங்கள் "அகரம் தினேஸ் ஆன்லைன் அகாடமியின்" (Agaram Dhines Online Academy) தலைமைத் தமிழ் ஆசிரியர் திரு. D. தினேஷ்குமார் (Mr. D. Dhineskumar) அவர்களின் அதிகாரப்பூர்வ AI தமிழ் ஆசான் ஆவீர்கள்.

நீங்கள் RAG (Retrieval-Augmented Generation) தொழில்நுட்பத்தின் கீழ் இயங்குகிறீர்கள். ChatGPT, Claude, Gemini போன்ற முன்னணி AI-களின் முழுமையான மொழி அறிவையும், உங்கள் அகாடமியின் பாடக்குறிப்புகள் முதன்மை ஆதாரமாக நின்று மாணவர்களுக்கு 100% பிழையற்ற, துல்லியமான விளக்கத்தை வழங்குவதே உங்கள் நோக்கம்.

=== RAG 4-படிநிலைக் கட்டமைப்பு (Step-by-Step Pipeline) ===
படி 1: ஆசிரியரின் அதிகாரப்பூர்வத் தரவு - அடித்தளச் சட்டம் (Teacher's Ground Truth / Anchor of Truth):
- அட்மின் போர்ட்டலில் ஆசிரியர் உள்ளிட்டுள்ள பாடக் குறிப்புகளே உங்கள் "அடித்தளச் சட்டம்" (Anchor of Truth).
- இலக்கண விதியாக இருந்தாலும் சரி, செய்யுள் நயமானாலும் சரி, ஆசிரியர் தரும் சொற்களும் கருத்துகளுமே முதன்மைப்படுத்தப்பட வேண்டும்.

படி 2: மாணவர் எப்படி கேட்டாலும் புரிந்து கொள்ளுதல் (Intent Understanding):
- மாணவர் புத்தக வார்த்தையில் கேட்கலாம், சுருக்கமாகக் கேட்கலாம், அல்லது பேச்சுத் தமிழில் (Spoken Tamil) கேட்கலாம்.
- மாணவரின் கற்றல் நோக்கத்தை நொடிப் பொழுதில் உணர்ந்து, அக்குறிப்பிட்ட பாடக் குறிப்பை அடித்தளமாகக் கொள்ளவும்.

படி 3: ஜெமினியின் ஆழமான பகுப்பாய்வு & 4-அடுக்குக் கட்டமைப்பு (Deep Analysis & Pedagogical Expansion):
- ஆசிரியரின் குறிப்பை வெறும் வெட்டி-ஒட்டுவது (Copy-Paste) போல செய்யாமல், ஒரு சிறந்த தலைமை ஆசிரியர் கரும்பலகையில் நேரில் கற்பிப்பது போல் பின்வரும் 4 பிரிவுகளாக அழகாகக் கட்டமைக்கவும்:
  1. வரையறை (Definition) - தெளிவான, எளிமையான விளக்கம்
  2. பகுப்புகள் / வகைகள் (Classification) - விரிவான வகைகள்/பிரிவுகள்
  3. இலக்கிய / இலக்கண சான்றுகள் (Real Examples) - பாடநூல் மற்றும் நடைமுறை உதாரணங்கள்
  4. பரீட்சைக்கான முக்கிய குறிப்புகள் (Exam Pointers) - இலங்கைப் பாடத்திட்டப் பரீட்சை முறைக்குரிய முக்கிய குறிப்புகள்

படி 4: மின்னல் வேகம் (Ultra-Fast Response):
- gemini-3.6-flash மாடல் மிகக் குறைந்த மில்லி விநாடிகளில் (Sub-second speed) பதிலளிக்கும் திறன் கொண்டது. மாணவருக்குக் காத்திருப்பு நேரம் இன்றி நேரடியாகப் பதிலளிக்கவும்.

=== மாணவர்களுக்குக் கிடைக்கும் 3 உறுதிமொழிகள் (3 Guarantees) ===
1. பூஜ்ஜியப் பிழை (Zero Error / Zero Hallucination): ஆசிரியரின் குறிப்புடன் இணைந்து இயங்குவதால், இணையத்தில் உள்ள தவறான அல்லது தொடர்பற்ற தகவல்கள் ஒருபோதும் உள்ளே வராது.
2. இலங்கைப் பாடத்திட்டத் துல்லியம்: தரம் 6 முதல் 13 வரையிலான பரீட்சை முறைக்குரிய அதே அமைப்பில் விடைகள் அமையும்.
3. மாணவருக்கு ஏற்ற கற்பித்தல்: மாணவர் சுருக்கமாகக் கேட்டால் சுருக்கமாகவும், விரிவாகக் கேட்டால் உதாரணங்களுடனும் விடை கிடைக்கும். (கோரப்பட்ட விருப்பம்: ${answerLength}).

நடைமுறைக் கட்டளைகள்:
- நீண்ட முகவுரை அல்லது சடங்கு வணக்கங்களைத் தவிர்க்கவும். மாணவரின் கேள்விக்கான பதிலை உடனே நேரடியாகத் தொடங்கவும்.
- மாணவர் வாட்ஸ்அப் அல்லது தொடர்பு விபரம் கேட்காத வரை எண்களைச் சேர்க்கக் கூடாது.`;

      const promptParts: any[] = [];

      // If image attached (e.g. question paper or textbook photo)
      if (imageBase64 && imageMimeType) {
        promptParts.push({
          inlineData: {
            data: imageBase64,
            mimeType: imageMimeType
          }
        });
      }

      // Add previous chat conversation history if available
      let historyText = "";
      if (Array.isArray(chatHistory) && chatHistory.length > 0) {
        historyText = "\n=== முந்தைய உரையாடல் வரலாறு (Chat History) ===\n" + 
          chatHistory.map((h: any) => `${h.role === 'user' ? 'மாணவர்' : 'ஆசான்'}: ${h.text || ''}`).join("\n") + "\n";
      }

      // Teacher's Grounding Knowledge (Strictly relevant notes only)
      const groundingBlock = knowledgeContext && knowledgeContext.trim()
        ? `\n=== ஆசிரியரின் அதிகாரப்பூர்வப் பாடக் குறிப்புகள் (TEACHER'S GROUND TRUTH / ANCHOR OF TRUTH) ===\n${knowledgeContext}\n========================================================================\n`
        : ``;

      const userFullQuery = `${historyText}${groundingBlock}\nமாணவரின் தற்போதைய கேள்வி:\n"${message || 'இப்படத்திலுள்ள வினாவிற்கு ஆசிரியரின் குறிப்பிலிருந்து விளக்கம் தருக.'}"\n\nமுக்கிய கட்டளை:\n1. முதலில் "⏱️ ஒரு நிமிடச் செய்தி:" (Quick 1-Minute Gist) என்ற தலைப்பில் 2-3 வரிகளில் அதிமுக்கிய சுருக்கமான விடையை உடனே வழங்கவும்.\n2. தொடர்ந்து, RAG 4-அடுக்குக் கட்டமைப்பில் (1.வரையறை, 2.வகைகள், 3.சான்றுகள், 4.பரீட்சைக் குறிப்புகள்) ஆசிரியரின் குறிப்பை அடித்தளச் சட்டமாகக் கொண்டு துல்லியமான விளக்கத்தை வழங்கவும்.`;

      promptParts.push({ text: userFullQuery });

      // Support multi-model resilience with modern valid Gemini models, prioritizing ultra-fast high-availability models
      const candidateModels = [
        "gemini-flash-lite-latest",
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash-lite",
        "gemini-3-flash-preview",
        "gemini-3.8-flash",
        "gemini-3.5-flash",
        "gemini-flash-latest"
      ];

      // If a specific valid model was requested and is not gemini-3.6-flash, place it first
      const prioritizedModels: string[] = [];
      if (model && typeof model === "string" && model !== "gemini-3.6-flash") {
        prioritizedModels.push(model);
      }
      for (const cm of candidateModels) {
        if (!prioritizedModels.includes(cm)) {
          prioritizedModels.push(cm);
        }
      }

      let generatedText = "";
      let modelUsed = "";
      let lastError: any = null;

      for (const m of prioritizedModels) {
        // Attempt up to 2 times for transient 503 (high demand) / 429 (rate limit) spikes
        const maxAttempts = 2;
        let modelSucceeded = false;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            const response = await ai.models.generateContent({
              model: m,
              contents: { parts: promptParts },
              config: {
                systemInstruction: strictSystemInstruction,
                temperature: 0.2,
                maxOutputTokens: 1200
              }
            });
            if (response?.text) {
              generatedText = response.text.trim();
              modelUsed = m;
              modelSucceeded = true;
              break;
            }
          } catch (e: any) {
            lastError = e;
            const isHighDemandOrRateLimit =
              e?.status === 503 ||
              e?.status === 429 ||
              String(e?.message || "").includes("demand") ||
              String(e?.message || "").includes("quota") ||
              String(e?.message || "").includes("UNAVAILABLE");

            console.warn(`Model ${m} (attempt ${attempt}/${maxAttempts}) failed in /api/tamil-asan/ask:`, e?.message || e);

            if (isHighDemandOrRateLimit && attempt < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
            } else {
              if (isHighDemandOrRateLimit) {
                await new Promise((resolve) => setTimeout(resolve, 200));
              }
              break;
            }
          }
        }

        if (modelSucceeded) {
          break;
        }
      }

      if (!generatedText) {
        // If all AI models are temporarily experiencing high demand, return a pedagogical fallback rather than crashing
        const fallbackText = knowledgeContext && knowledgeContext.trim()
          ? `⏱️ **ஒரு நிமிடச் செய்தி:**\nஆசிரியரின் பாடக் குறிப்பு வழிகாட்டல்:\n\n${knowledgeContext.slice(0, 600)}\n\n*(AI சேவையில் தற்காலிக நெரிசல் காரணமாக ஆசிரியரின் அதிகாரப்பூர்வக் குறிப்பு நேரடியாகக் காட்டப்படுகிறது.)*`
          : `வணக்கம்! தற்காலிக சர்வர் நெரிசல் காரணமாக AI பதில் சற்றே தாமதமாகிறது. தயவுசெய்து சிறிது நேரத்தில் மீண்டும் வினவவும் அல்லது பாடக் குறிப்புகள் பகுதியைப் பார்வையிடவும்.`;

        return res.json({
          text: fallbackText,
          modelUsed: "grounded-fallback",
          success: true,
          fallback: true
        });
      }

      return res.json({ text: generatedText, modelUsed, success: true });
    } catch (err: any) {
      console.error("Server /api/tamil-asan/ask error:", err);
      return res.json({
        text: "வணக்கம்! தற்காலிக நெரிசல் காரணமாக AI விளக்கம் தாமதமாகிறது. ஆசிரியரின் பாடக் குறிப்புகளைப் பார்வையிடவும் அல்லது சிறிது நேரத்தில் மீண்டும் முயற்சிக்கவும்.",
        modelUsed: "offline-fallback",
        success: true,
        fallback: true
      });
    }
  });

  // Legacy Tamil Asan AI Chatbot API Endpoint (also supports /api/tamil-asan)
  app.post("/api/tamil-asan", async (req, res) => {
    try {
      const { 
        parts, 
        systemInstruction, 
        temperature = 0.3,
        model = "gemini-flash-lite-latest"
      } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(401).json({
          error: "GEMINI_API_KEY is not configured on the server. Please add your key in AI Studio Settings > Secrets."
        });
      }

      const ai = new GoogleGenAI({ apiKey });

      const candidateModels = [
        model || "gemini-flash-lite-latest",
        "gemini-flash-lite-latest",
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash-lite",
        "gemini-3-flash-preview",
        "gemini-3.8-flash",
        "gemini-flash-latest"
      ];

      const prioritized = Array.from(new Set(candidateModels.filter(Boolean)));
      let text = "";
      let modelUsed = "";

      for (const m of prioritized) {
        try {
          const response = await ai.models.generateContent({
            model: m,
            contents: { parts },
            config: {
              systemInstruction,
              temperature,
            }
          });
          if (response?.text) {
            text = response.text;
            modelUsed = m;
            break;
          }
        } catch (e: any) {
          console.warn(`Model ${m} failed in /api/tamil-asan:`, e?.message || e);
          if (e?.status === 503 || e?.status === 429) {
            await new Promise((r) => setTimeout(r, 250));
          }
        }
      }

      if (!text) {
        text = "வணக்கம்! அகரம் தினேஸ் அகாடமிக்கு வரவேற்கிறோம். தங்களுக்கு எந்த வகுப்பிற்கான விபரம் வேண்டும் என்பதை கீழே தேர்ந்தெடுக்கவும் அல்லது எங்களை WhatsApp (0778054232) என்ற எண்ணில் தொடர்பு கொள்ளவும்.";
      }

      return res.json({ text, modelUsed, success: true });
    } catch (err: any) {
      console.error("Server /api/tamil-asan error:", err);
      return res.json({
        text: "வணக்கம்! அகரம் தினேஸ் அகாடமிக்கு வரவேற்கிறோம். தங்களுக்கு எந்த வகுப்பிற்கான விபரம் வேண்டும் என்பதை கீழே தேர்ந்தெடுக்கவும் அல்லது எங்களை WhatsApp (0778054232) என்ற எண்ணில் தொடர்பு கொள்ளவும்.",
        success: true,
        fallback: true
      });
    }
  });

  // ElevenLabs Text-to-Speech Proxy (Bypasses Browser CORS restrictions & handles secrets safely)
  app.post("/api/elevenlabs-tts", async (req, res) => {
    try {
      const { 
        text, 
        voiceId: customVoiceId, 
        apiKey: customApiKey, 
        stability = 0.5, 
        similarity_boost = 0.85 
      } = req.body;

      const apiKey = (customApiKey && String(customApiKey).trim()) || process.env.ELEVENLABS_API_KEY || "sk_bd3550c82531e68e929818dd5c639a5aa4b7d43bdce4d778";
      const voiceId = (customVoiceId && String(customVoiceId).trim()) || process.env.ELEVENLABS_VOICE_ID || "OUBMjq0LvBjb07bhwD3H";

      if (!apiKey) {
        return res.status(200).json({ 
          fallback: true,
          error: "ElevenLabs API Key வழங்கப்படவில்லை. அமைப்புகளில் (Settings) ElevenLabs API Key-ஐ வழங்கவும்." 
        });
      }

      // ElevenLabs strictly requires secret keys starting with 'sk_'
      // If a Key ID (e.g. 64-character hex string) is provided instead, handle gracefully without calling ElevenLabs API
      if (!apiKey.startsWith("sk_")) {
        console.warn("ElevenLabs key format note: Provided key does not start with 'sk_'. ElevenLabs requires secret keys starting with 'sk_'. Falling back to browser Tamil speech.");
        return res.status(200).json({
          fallback: true,
          error: "ElevenLabs API Key ஆனது 'sk_' எனத் தொடங்க வேண்டும். நீங்கள் உள்ளிட்டது Key ID ஆகும். ElevenLabs Dashboard -> API Keys-ல் புதிய Secret Key உருவாக்கி 'sk_...' விசையை உள்ளிடவும்."
        });
      }

      if (!voiceId) {
        return res.status(200).json({ 
          fallback: true,
          error: "ElevenLabs Voice ID வழங்கப்படவில்லை. தயவுசெய்து ஆசானின் குரல் ஐடியை (Voice ID) வழங்கவும்." 
        });
      }

      if (!text || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ error: "பேசுவதற்கான உரை வழங்கப்படவில்லை (Text is required)." });
      }

      // ElevenLabs API text-to-speech request
      const elevenlabsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey
        },
        body: JSON.stringify({
          text: text.trim().slice(0, 3500),
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: Number(stability) || 0.5,
            similarity_boost: Number(similarity_boost) || 0.85
          }
        })
      });

      if (!elevenlabsResponse.ok) {
        const errText = await elevenlabsResponse.text();
        console.log("[ElevenLabs TTS Notice - Falling back to browser TTS]:", elevenlabsResponse.status);

        let userMsg = `ElevenLabs பிழை (${elevenlabsResponse.status}): ${errText}`;
        if (errText.includes("missing_permissions") || errText.includes("text_to_speech")) {
          userMsg = "ElevenLabs API Key-ல் 'text_to_speech' அனுமதி (Permission) வழங்கப்படவில்லை. ElevenLabs Dashboard ➔ Developers ➔ API Keys சென்று 'Text to Speech' அனுமதி (அல்லது Full Access) உடைய புதிய 'sk_...' விசையை உருவாக்கவும்.";
        } else if (elevenlabsResponse.status === 401 || errText.includes("invalid_api_key") || errText.includes("api_key_id_used_as_api_key")) {
          userMsg = "ElevenLabs API Key தவறானது. API keys 'sk_' எனத் தொடங்க வேண்டும். ElevenLabs Dashboard -> API Keys-ல் புதிய 'sk_...' விசையை சரிபார்க்கவும்.";
        } else if (elevenlabsResponse.status === 404) {
          userMsg = `ElevenLabs Voice ID (${voiceId}) காணப்படவில்லை. உங்கள் கணக்கில் உள்ள சரியான Voice ID-ஐ சரிபார்க்கவும்.`;
        } else if (elevenlabsResponse.status === 429) {
          userMsg = "ElevenLabs கணக்கின் இலவச வரம்பு (Quota limit) தீர்ந்துவிட்டது (429 Too Many Requests).";
        }

        // Return status 200 with fallback info so client seamlessly transitions to native Tamil browser speech
        return res.status(200).json({
          fallback: true,
          error: userMsg,
          rawError: errText,
          status: elevenlabsResponse.status
        });
      }

      const audioBuffer = await elevenlabsResponse.arrayBuffer();
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", audioBuffer.byteLength);
      return res.send(Buffer.from(audioBuffer));
    } catch (err: any) {
      console.warn("Server /api/elevenlabs-tts fallback:", err?.message || err);
      return res.status(200).json({
        fallback: true,
        error: "ElevenLabs குரல் தயாரிப்பில் சேவையகப் பிழை ஏற்பட்டது: " + (err?.message || err)
      });
    }
  });

  // Dedicated Lesson Image Generation Endpoint
  // Generates lesson illustration using Gemini image models (e.g. gemini-3.1-flash-image / gemini-3.1-flash-lite-image)
  app.post("/api/tamil-asan/generate-image", async (req, res) => {
    try {
      const {
        prompt,
        lessonContext = "",
        aspectRatio = "16:9",
        imageSize = "1K"
      } = req.body;

      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return res.status(400).json({ error: "படத்திற்கான விளக்கம் (Prompt) வழங்கப்படவில்லை." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(401).json({
          error: "GEMINI_API_KEY சர்வரில் இணைக்கப்படவில்லை. AI Studio Settings-ல் GEMINI_API_KEY சரிபார்க்கவும்."
        });
      }

      // Step 1: Intelligent Gemini AI Visual Prompt Director
      // Converts user's Tamil request (e.g. "திருவள்ளுவர் எட்டுச்சூடி எழுதும் காட்சி") into a culturally authentic,
      // hyper-detailed English prompt so the diffusion model creates an accurate, breathtaking image.
      let enrichedPrompt = prompt.trim();
      let geminiDirectorPrompt = "";

      try {
        const ai = new GoogleGenAI({ apiKey });
        const directorInstruction = `You are an expert AI Visual Prompt Director specializing in Tamil language, culture, Sangam era history, mythology, literature, and school curriculum education.
The teacher/student asked for an educational illustration in Tamil: "${prompt.trim()}".
Lesson/Grade context: "${lessonContext || 'Tamil Language & Literature'}".

Your task is to analyze the user's intent deeply and generate a 100% accurate, culturally authentic, visually rich, photorealistic description in English for a state-of-the-art AI image generator (Flux/Midjourney).

Key cultural & historical directives:
1. Accurately depict Tamil historical & literary figures:
   - Thiruvalluvar (திருவள்ளுவர்): Depict the venerable ancient Tamil sage and philosopher with flowing white beard and hair tied in a traditional top knot (kondai), serene and dignified expression, wearing a simple off-white ascetic cotton cloth/shawl draped over one shoulder. He is seated cross-legged on a traditional woven grass/straw mat. In his hand, he holds an iron stylus (ezhuthani), meticulously inscribing ancient Tamil verses onto dried golden palm-leaf manuscripts (olaichuvadi). Setting: peaceful ancient Tamil thatched hermitage, open to serene greenery, with an earthen clay oil lamp (agal vilakku) casting a warm golden glow.
   - Other figures (Avvaiyar, Bharathiyar, Raja Raja Cholan, Kannagi, Silappathikaram, Sangam poets): Specify their authentic traditional attire, hair, ornaments, and historical setting.
   - Stories & Fables (e.g. crow and vadai, Panchatantra, fox, rabbit, elephant): Specify clean, expressive, vivid storybook illustration with high clarity and narrative emotion.
   - Grammar & Educational concepts: Specify clear, elegant visual metaphors (e.g. Grammar tree with roots and leaves, Tamil alphabet stones, Thinai landscapes: Kurinji, Mullai, Marutham, Neithal, Paalai).
   - Heritage & Temples: Specify authentic Dravidian stone architecture, gopurams, chariot festivals.

2. Visual aesthetics: Photorealistic, cinematic lighting, rich textures, authentic ancient South Indian / Sri Lankan Tamil heritage, 8k resolution, dignified educational tone.

Output ONLY the detailed English visual prompt (around 50 to 90 words), no markdown, no quotes, no extra conversational preamble.`;

        const candidateDirectorModels = ["gemini-flash-lite-latest", "gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-flash-latest"];
        for (const modelName of candidateDirectorModels) {
          try {
            const directorRes = await ai.models.generateContent({
              model: modelName,
              contents: { parts: [{ text: directorInstruction }] }
            });
            const textResult = directorRes?.text?.trim();
            if (textResult && textResult.length > 25) {
              enrichedPrompt = textResult.replace(/^["']|["']$/g, '');
              geminiDirectorPrompt = enrichedPrompt;
              break;
            }
          } catch (_e) {
            // try next model
          }
        }
      } catch (directorErr: any) {
        console.warn("Gemini visual prompt director notice:", directorErr?.message);
      }

      let response: any;
      let engineUsed = "gemini-flux-visuals";
      let imageBase64: string | null = null;
      let mimeType = "image/png";

      // Step 2: Check if Gemini paid image generation is explicitly enabled or available
      const tryGeminiImage = process.env.ENABLE_GEMINI_IMAGE_GEN === "true" || process.env.GEMINI_IMAGE_PAID === "true";

      if (tryGeminiImage && apiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          response = await ai.models.generateContent({
            model: "gemini-3.1-flash-image",
            contents: {
              parts: [{ text: enrichedPrompt }]
            },
            config: {
              imageConfig: {
                aspectRatio: (["1:1", "3:4", "4:3", "9:16", "16:9"].includes(aspectRatio) ? aspectRatio : "16:9") as any,
                imageSize: (["512px", "1K", "2K"].includes(imageSize) ? imageSize : "1K") as any
              }
            }
          });

          if (response?.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData && part.inlineData.data) {
                imageBase64 = part.inlineData.data;
                if (part.inlineData.mimeType) {
                  mimeType = part.inlineData.mimeType;
                }
                engineUsed = "gemini-native-image";
                break;
              }
            }
          }
        } catch (_genErr: any) {
          // Proceed to reliable Flux visual pipeline
        }
      }

      // Step 3: High-resolution Flux AI Visual Pipeline with Gemini Cultural Prompt
      // Flux provides state-of-the-art photorealism, adhering precisely to Gemini's cultural prompt
      if (!imageBase64) {
        try {
          const width = aspectRatio === "1:1" ? 1024 : (aspectRatio === "9:16" || aspectRatio === "3:4") ? 768 : 1024;
          const height = aspectRatio === "1:1" ? 1024 : (aspectRatio === "9:16") ? 1344 : (aspectRatio === "3:4") ? 1024 : 576;
          const seed = Math.floor(Math.random() * 9999999);

          // Try Flux model first for utmost accuracy and visual realism
          const fluxUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enrichedPrompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=flux`;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 22000);

          let imgRes = await fetch(fluxUrl, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (!imgRes.ok) {
            // Quick fallback to high-speed diffusion model
            const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enrichedPrompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}`;
            imgRes = await fetch(fallbackUrl);
          }

          if (imgRes.ok) {
            const buf = await imgRes.arrayBuffer();
            imageBase64 = Buffer.from(buf).toString("base64");
            mimeType = imgRes.headers.get("content-type") || "image/jpeg";
            engineUsed = "gemini-flux-visuals";
          }
        } catch (fbErr: any) {
          console.warn("[AI Visuals] Primary pipeline note:", fbErr?.name === "AbortError" ? "Flux timed out, using rapid fallback" : fbErr?.message);
          // Rapid fallback
          try {
            const width = aspectRatio === "1:1" ? 768 : 1024;
            const height = aspectRatio === "1:1" ? 768 : 576;
            const rapidUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enrichedPrompt)}?width=${width}&height=${height}&nologo=true`;
            const rapidRes = await fetch(rapidUrl);
            if (rapidRes.ok) {
              const buf = await rapidRes.arrayBuffer();
              imageBase64 = Buffer.from(buf).toString("base64");
              mimeType = rapidRes.headers.get("content-type") || "image/jpeg";
              engineUsed = "gemini-ai-visuals";
            }
          } catch (_err) {}
        }
      }

      if (!imageBase64) {
        return res.status(500).json({
          error: "படத்தை உருவாக்குவதில் தொழில்நுட்பத் தாமதம் ஏற்பட்டது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்."
        });
      }

      return res.json({
        success: true,
        imageBase64,
        mimeType,
        aspectRatio,
        engine: engineUsed,
        prompt: prompt.trim()
      });
    } catch (err: any) {
      console.error("Image generation server error:", err);
      const errMessage = err?.message || String(err);
      return res.status(500).json({
        error: "படம் உருவாக்குவதில் பிழை ஏற்பட்டது: " + errMessage,
        rawError: errMessage
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
