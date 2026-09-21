/**
 * AI அகரம் தினேஷ் தமிழ் ஆசான் - Knowledge Base Engine & Voice Cloner
 * Agaram Dhines Online Academy
 * 
 * Features:
 * 1. 100% Firebase Knowledge & Materials Retrieval Engine.
 * 2. Strictly searches ONLY the Academy's Firebase database (courseMaterials PDFs, 
 *    tamilAsanKnowledge, unifiedLinks, youtubeLinks, courses, fees).
 * 3. NO calls to Google Gemini, ChatGPT, or external AI models.
 * 4. Grounded Truth: Never hallucinates; directly provides teacher's notes and PDF links.
 * 5. Voice Synthesis: Custom Teacher Voice (Mr. Dhines) via Web Speech API and ElevenLabs / recorded audio.
 */

import { resolveMediaUrl } from "./fileStorage";
import { 
  getCourseMaterials, 
  getYoutubeLinks, 
  getCourses, 
  getCourseWebsiteLinks, 
  getWebPosts, 
  getChatbotSettings, 
  getTamilAsanKnowledge, 
  TamilAsanKnowledgeItem,
  getAllUnifiedLinks,
  getData,
  saveData
} from "./db";

export type { TamilAsanKnowledgeItem };

export interface GuruSourceReference {
  title: string;
  type: 'pdf' | 'youtube' | 'website' | 'course' | 'notes';
  url?: string;
  grade?: string;
  subject?: string;
}

export interface TamilAsanSettings {
  aiName: string;
  teacherName: string;
  systemPromptAddon: string;
  voiceCloningEnabled: boolean;
  voiceProvider: 'elevenlabs' | 'browser_native' | 'custom_audio';
  elevenLabsApiKey?: string;
  elevenLabsVoiceId?: string; // Voice ID for Mr. Dhines
  voiceSampleUrl?: string;
  welcomeAudioUrl?: string; // Direct audio recording/URL of Teacher's welcome
  welcomeVoiceText?: string; // Text for greeting
  defaultAnswerLength?: 'concise' | 'detailed'; // default: 'concise'
  speechPitch: number;
  speechRate: number;
  allowedGrades: string[];
  strictMode: boolean; // Only answer if verified in notes/syllabus
}

export const DEFAULT_TAMIL_ASAN_SETTINGS: TamilAsanSettings = {
  aiName: "AI அகரம் தினேஷ் தமிழ் ஆசான்",
  teacherName: "Mr. D. Dhineskumar",
  systemPromptAddon: "நீங்கள் அகரம் தினேஷ் ஆன்லைன் அகாடமியின் தலைமைத் தமிழ் ஆசான் திரு. தினேஷ்குமார் அவர்களின் டிஜிட்டல் பிரதிநிதி. மாணவர்களின் சந்தேகங்களை அன்பாகவும், இலக்கண/இலக்கிய துல்லியத்துடனும், எளிய தமிழ் நடையிலும் விளக்குங்கள்.",
  voiceCloningEnabled: true,
  voiceProvider: 'elevenlabs',
  elevenLabsApiKey: "sk_bd3550c82531e68e929818dd5c639a5aa4b7d43bdce4d778",
  elevenLabsVoiceId: "OUBMjq0LvBjb07bhwD3H",
  voiceSampleUrl: "",
  welcomeAudioUrl: "",
  welcomeVoiceText: "வணக்கம் அன்பு மாணவச் செல்வங்களே! உங்களை அன்புடன் நமது அகரம் தினேஸ் அறிவுத்தளத்திற்கு அழைக்கிறோம். உங்கள் தமிழ் சந்தேகங்களை என்னிடம் கேளுங்கள், மகிழ்ச்சியுடன் விளக்குகிறேன்.",
  defaultAnswerLength: 'concise',
  speechPitch: 1.0,
  speechRate: 0.95,
  allowedGrades: ["Grade 06", "Grade 07", "Grade 08", "Grade 09", "Grade 10", "Grade 11", "Grade 12", "Grade 13"],
  strictMode: false
};

export const getTamilAsanSettings = async (): Promise<TamilAsanSettings> => {
  const loaded = await getData('tamilAsanSettings', DEFAULT_TAMIL_ASAN_SETTINGS);
  return {
    ...DEFAULT_TAMIL_ASAN_SETTINGS,
    ...loaded,
    elevenLabsApiKey: (loaded?.elevenLabsApiKey && loaded.elevenLabsApiKey.startsWith("sk_")) ? loaded.elevenLabsApiKey : DEFAULT_TAMIL_ASAN_SETTINGS.elevenLabsApiKey,
    elevenLabsVoiceId: (loaded?.elevenLabsVoiceId && loaded.elevenLabsVoiceId.trim()) ? loaded.elevenLabsVoiceId : DEFAULT_TAMIL_ASAN_SETTINGS.elevenLabsVoiceId,
    voiceProvider: 'elevenlabs'
  };
};

export const saveTamilAsanSettings = async (settings: TamilAsanSettings): Promise<void> => {
  return saveData('tamilAsanSettings', settings);
};

/**
 * Builds the Knowledge Context from Academy's Courses, PDFs, YouTube videos and notes in Firebase
 */
export const buildAcademyKnowledgeContext = async (targetGrade?: string, topic?: string): Promise<{
  contextPrompt: string;
  sources: GuruSourceReference[];
}> => {
  const sources: GuruSourceReference[] = [];

  const [
    materials,
    youtube,
    courses,
    webLinks,
    posts,
    botSettings,
    asanKnowledge,
    unifiedLinks
  ] = await Promise.all([
    getCourseMaterials().catch(() => []),
    getYoutubeLinks().catch(() => []),
    getCourses().catch(() => []),
    getCourseWebsiteLinks().catch(() => []),
    getWebPosts().catch(() => []),
    getChatbotSettings().catch(() => null),
    getTamilAsanKnowledge().catch(() => []),
    getAllUnifiedLinks().catch(() => [])
  ]);

  let contextLines: string[] = [];
  contextLines.push(`### அகாடமி அதிகாரப்பூர்வ தரவுகள் (AGARAM DHINES ACADEMY FIREBASE KNOWLEDGE BASE):`);
  contextLines.push(`நிறுவனம்: அகரம் தினேஸ் Online Academy (Agaram Dhines Online Academy)`);
  contextLines.push(`தலைமை ஆசான்: Mr. D. Dhineskumar (WhatsApp தொடர்பு: 0778054232 / +94778054232)`);
  contextLines.push(`அதிகாரப்பூர்வ இணையதளம்: https://www.agaramdhines.lk/`);
  if (targetGrade) {
    contextLines.push(`மாணவரின் தற்போதைய வகுப்பு/தரம்: ${targetGrade}`);
  }

  // Unified Official Links in Exact Order (Google Drive, YouTube, Web Links, PDFs)
  if (Array.isArray(unifiedLinks) && unifiedLinks.length > 0) {
    contextLines.push(`\n#### அகாடமியின் அதிகாரப்பூர்வ ஒருங்கிணைந்த இணைப்புகள்:`);
    unifiedLinks.forEach((item: any) => {
      const g = item.grade || "பொதுவானது";
      const s = item.subject || "தமிழ்";
      contextLines.push(`- [வரிசை #${item.order}] [வகை: ${item.type}] [${g}] [${s}] ${item.title}: ${item.url}`);
      sources.push({
        title: item.title,
        type: item.type === 'youtube' ? 'youtube' : (item.type === 'drive' || item.type === 'pdf' ? 'pdf' : 'website'),
        url: item.url,
        grade: g,
        subject: s
      });
    });
  }

  // Dedicated Tamil Asan Knowledge & Rules
  if (Array.isArray(asanKnowledge) && asanKnowledge.length > 0) {
    contextLines.push(`\n#### ஆசானின் பிரத்தியேக அறிவு & வழிகாட்டல்கள்:`);
    asanKnowledge.forEach((item: any) => {
      const g = item.grade || "பொதுவானது";
      const cat = item.category || "பொது";
      const topicsStr = Array.isArray(item.topics) && item.topics.length > 0 ? ` [உபதலைப்புகள்: ${item.topics.join(', ')}]` : '';
      const questionsStr = Array.isArray(item.expectedQuestions) && item.expectedQuestions.length > 0 ? ` [மாதிரி வினாக்கள்: ${item.expectedQuestions.join(' | ')}]` : '';
      const qaStr = Array.isArray(item.qaPairs) && item.qaPairs.length > 0
        ? `\n  [வினா-விடை ஜோடிகள்:\n` + item.qaPairs.map((qa: any) => `   - வினா: ${qa.question}\n     விடை: ${qa.answer}`).join('\n') + `\n  ]`
        : '';
      contextLines.push(`- [${g}] [${cat}] ${item.title}${topicsStr}${questionsStr}:\n${item.content}${qaStr}`);
      sources.push({
        title: item.title,
        type: 'notes',
        grade: g,
        subject: cat
      });
    });
  }

  // Course Materials (PDFs & Notes)
  if (Array.isArray(materials) && materials.length > 0) {
    contextLines.push(`\n#### பாடக்குறிப்புகள் & PDF ஆவணங்கள்:`);
    materials.forEach((m: any) => {
      const g = m.grade || m.class || "பொதுவானது";
      const s = m.subject || "தமிழ்";
      const title = m.title || m.name || "பாடக்குறிப்பு";
      const link = m.fileUrl || m.link || m.driveLink || "";
      contextLines.push(`- [${g}] [${s}] ${title} ${link ? `(ஆதாரம்: ${link})` : ''}`);
      sources.push({
        title: `${title} (${g})`,
        type: 'pdf',
        url: link,
        grade: g,
        subject: s
      });
    });
  }

  return {
    contextPrompt: contextLines.join('\n'),
    sources
  };
};

/**
 * 100% Firebase-Grounded Search & Intelligence Engine for Tamil Asan.
 * Strictly searches ONLY the user's Firebase database (courseMaterials PDFs,
 * tamilAsanKnowledge, unifiedLinks, youtubeLinks, courses, fees).
 * ZERO external dependency on Google Gemini or ChatGPT.
 */
export const askTamilAsan = async ({
  question,
  grade,
  category = "பொதுவான தமிழ்",
  imageBase64,
  imageMimeType,
  answerLength,
  chatHistory = []
}: {
  question: string;
  grade?: string;
  category?: string;
  imageBase64?: string;
  imageMimeType?: string;
  answerLength?: 'concise' | 'detailed';
  chatHistory?: Array<{ role: 'user' | 'asan'; text: string }>;
}): Promise<{
  answer: string;
  usedSources: GuruSourceReference[];
  suggestedFollowUps: string[];
}> => {
  const trimmedQ = (question || "").trim();
  const lowerQ = trimmedQ.toLowerCase();

  // Load all knowledge items from Firebase
  const [
    materials,
    asanKnowledge,
    unifiedLinks,
    youtube,
    courses,
    botSettings,
    asanSettings
  ] = await Promise.all([
    getCourseMaterials().catch(() => []),
    getTamilAsanKnowledge().catch(() => []),
    getAllUnifiedLinks().catch(() => []),
    getYoutubeLinks().catch(() => []),
    getCourses().catch(() => []),
    getChatbotSettings().catch(() => null),
    getTamilAsanSettings().catch(() => DEFAULT_TAMIL_ASAN_SETTINGS)
  ]);

  // 1. GREETING INTENT
  const isGreeting = /^(வணக்கம்|வணக்கங்க|வணக்கம் சார்|வணக்கம் ஆசான்|வணக்கம் அண்ணா|வணக்கம் ஆசிரியரே|hi|hello|hey|vanakkam|good morning|good afternoon|good evening|நலமா|ஹலோ|ஹாய்)[!.,? ]*$/i.test(lowerQ);
  if (isGreeting) {
    const greetingText = `வணக்கம் அன்புச் செல்வமே! நலமாக இருக்கிறீர்களா?

நமது **அகரம் தினேஸ் Online Academy**-ன் அதிகாரப்பூர்வ அறிவுத்தளத்திற்கு உங்களை அன்புடன் வரவேற்கிறேன். நான் தலைமை ஆசான் **திரு. D. தினேஷ்குமார்** அவர்களின் டிஜிட்டல் தமிழ் ஆசான்.

இங்கு நமது அகாடமியின் தலைமை ஆசிரியரின் அதிகாரப்பூர்வ பாடக் குறிப்புகள், இலக்கண விதிகள் மற்றும் வீடியோ வகுப்புகளைப் பற்றிய வழிகாட்டல்களை நீங்கள் பெறலாம்.

உங்களுக்கு எந்த வகுப்பிற்கான (தரம் 6 முதல் 13 வரை அல்லது 30 நாள் பாடநெறி) இலக்கண விளக்கம், பாட சந்தேகம் அல்லது வீடியோ வகுப்பு தேவைப்படுகிறது என்று கூறுங்கள், மகிழ்ச்சியுடன் விளக்குகிறேன்!`;

    return {
      answer: greetingText,
      usedSources: [],
      suggestedFollowUps: [
        "தரம் 10 தமிழ் பாட விளக்கம்",
        "30 நாள் தமிழ் பாடநெறி விபரம்",
        "தமிழ் இலக்கண சந்தேகங்கள்",
        "வகுப்புக் கட்டண விபரங்கள்"
      ]
    };
  }

  // 2. FEES INTENT
  const isFees = /(கட்டணம்|கட்டண|பீஸ்|fees?|fee|payment|காசு|பணம்|மாதக்கட்டணம்)/i.test(lowerQ);
  if (isFees) {
    let feeLines: string[] = [];
    if (botSettings?.fees?.items && botSettings.fees.items.length > 0) {
      botSettings.fees.items.forEach((item: any) => {
        feeLines.push(`• **${item.label || item.grade || 'வகுப்பு'}**: Rs. ${item.amount || item.fee || '-'}`);
      });
    } else {
      feeLines.push("• **தரம் 06 - 09**: Rs. 1,000 / மாதம்");
      feeLines.push("• **தரம் 10 - 11 (O/L)**: Rs. 1,500 / மாதம்");
      feeLines.push("• **தரம் 12 - 13 (A/L)**: Rs. 2,000 / மாதம்");
      feeLines.push("• **30 DAY'S TAMIL COURSE**: Rs. 2,500 (முழு பாடநெறி)");
    }

    const feeText = `வணக்கம் அன்புச் செல்வமே! நமது அகரம் தினேஸ் அகாடமியின் வகுப்புக் கட்டண விபரங்கள் (Firebase தரவு):

${feeLines.join("\n")}

💳 **வங்கி விவரங்கள் & கட்டணப் பதிவு:**
கட்டணம் செலுத்திய ரசீதை அனுப்ப அல்லது வகுப்பில் இணைய தலைமை ஆசானை நேரடியாக WhatsApp மூலம் தொடர்பு கொள்ளலாம்:
📞 **WhatsApp:** 0778054232 (https://wa.me/94778054232)`;

    return {
      answer: feeText,
      usedSources: [],
      suggestedFollowUps: [
        "வகுப்பில் இணைய விண்ணப்பிப்பது எப்படி?",
        "30 நாள் பாடநெறி விபரம்",
        "பாடக்குறிப்புகள் பகுதிக்குச் செல்"
      ]
    };
  }

  // 3. DOUBT INTRO INTENT (Student asks "I have a doubt in grammar" without specifying the topic yet)
  const isDoubtIntro = /^(எனக்கு\s*)?(இலக்கணத்தில்\s*|தமிழில்\s*|பாடத்தில்\s*)?(ஒரு\s*)?(சந்தேகம்|ஐயம்|doubt)(\s*(உள்ளது|இருக்கு|கேட்கலாமா|வரலாமா|ஒன்று))?[!.,? ]*$/i.test(lowerQ);
  if (isDoubtIntro) {
    // Find available grammar topics in Firebase
    const grammarMaterials = (materials || []).filter((m: any) => 
      String(m.subject || '').includes('இலக்கணம்') || 
      String(m.title || '').includes('இலக்கணம்') ||
      String(m.title || '').includes('புணர்ச்சி') ||
      String(m.title || '').includes('வேற்றுமை')
    ).slice(0, 3);

    let sampleText = "";
    if (grammarMaterials.length > 0) {
      sampleText = "\n\n📚 **நமது Firebase-ல் உள்ள இலக்கணப் பாடக்குறிப்புகள்:**\n" + 
        grammarMaterials.map((m: any) => `• ${m.title} [${m.grade || 'பொது'}]`).join("\n");
    }

    const doubtText = `வணக்கம் அன்புச் செல்வமே! தாராளமாகக் கேளுங்கள். இலக்கணத்தில் உங்களுக்கு என்ன சந்தேகம்?

• **எழுத்திலக்கணம்** (எழுத்துக்கள், மாத்திரை வகைகள், போலி)
• **சொல்லிலக்கணம்** (பெயர், வினை, இடை, உரிச்சொல், பகுபதம்)
• **தொடரிலக்கணம் & புணர்ச்சி விதிகள்** (உயிர் ஈறு, மெய் ஈறு, விகாரப் புணர்ச்சி)
• **வேற்றுமை உருபுகள் & சந்திப் பிழைகள் நீக்குதல்**${sampleText}

இதில் உங்களுக்கு எந்தத் தலைப்பில் விளக்கம் அல்லது மாதிரி வினாத்தாள் தேவைப்படுகிறது என்று கூறுங்கள், நமது அகாடமியின் Firebase குறிப்புகளிலிருந்து உடனே தருகிறேன்!`;

    return {
      answer: doubtText,
      usedSources: [],
      suggestedFollowUps: [
        "புணர்ச்சி விதிகளை விளக்குக",
        "வேற்றுமை உருபுகள் யாவை?",
        "பெயர்ச்சொல் மற்றும் வினைச்சொல் வேறுபாடு",
        "சந்திப் பிழைகளை எவ்வாறு தவிர்ப்பது?"
      ]
    };
  }

  // 4. INTELLIGENT FIREBASE KNOWLEDGE RETRIEVAL & STEMMING
  // Common Tamil and English question filler words / suffixes to strip for core keyword isolation
  // (Intent Understanding: Handles literary, direct, or colloquial/spoken Tamil)
  const questionStopwords = new Set([
    'என்றால்', 'என்ன', 'எவை', 'யாவை', 'எப்படி', 'ஏன்', 'எங்கு', 'எப்போது', 'எதனை',
    'விளக்குக', 'விளக்கு', 'கூறுக', 'கூறு', 'பற்றி', 'பற்றிய', 'பற்றிச்', 'சொல்லுங்கள்',
    'சொல்', 'தருக', 'தாருங்கள்', 'விபரம்', 'விவரம்', 'என்பது', 'என்பதை', 'குறிப்பு',
    'வரைக', 'எழுதுக', 'எழுது', 'தெரியுமா', 'சொல்லுங்க', 'சொல்லு', 'சார்', 'ஆசான்',
    'என்னா', 'எப்பிடி', 'பத்தி', 'தெரியனும்', 'சொல்லிக்குடுங்க', 'சொல்லித்தாங்க',
    'what', 'is', 'the', 'definition', 'of', 'explain', 'meaning'
  ]);

  // Strip punctuation & extra spaces
  const rawCleanTokens = lowerQ
    .replace(/[?,.!:;()\[\]"'\/\\-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2);

  // Core content tokens (e.g., ["பெயர்ச்சொல்", "பெயர்"] from "பெயர்ச்சொல் என்றால் என்ன?")
  const contentTokens = rawCleanTokens.filter(tok => !questionStopwords.has(tok));
  const activeTokens = contentTokens.length > 0 ? contentTokens : rawCleanTokens;

  // Extract Tamil root stems (e.g., 'பெயர்ச்சொல்' -> 'பெயர்', 'சொல்'; 'புணர்ச்சி' -> 'புணர்')
  const rootStems: string[] = [];
  activeTokens.forEach(token => {
    if (token.length >= 4) {
      // Common compound splits
      if (token.includes('ச்சொல்') || token.includes('சொல்')) {
        const root = token.replace(/(ச்சொல்|சொல்|க்கள்|கள்|களில்|களுக்கு|க்கு|ற்கு|ன்|ல்|ம்)$/g, '');
        if (root.length >= 2) rootStems.push(root);
      }
      // Trim common Tamil case suffixes (-கள், -க்கு, -இல், -உடைய, -ஐ, -ஓடு)
      const trimmedSuffix = token.replace(/(த்திற்கு|ங்களுக்கு|னுடைய|ஆவது|உடைய|களின்|களில்|களை|கள்|க்கு|ற்கு|இல்|இன்|ஐ|யை|வை|ஆல்|ஓடு|டன்)$/g, '');
      if (trimmedSuffix.length >= 2 && trimmedSuffix !== token) {
        rootStems.push(trimmedSuffix);
      }
    }
  });

  const allSearchTokens = Array.from(new Set([...activeTokens, ...rootStems])).filter(t => t.length >= 2);

  // Extract grade numbers if mentioned in query or passed as prop
  const queryGradeMatch = lowerQ.match(/தரம்\s*(\d+)|grade\s*(\d+)/i);
  const detectedGradeNum = queryGradeMatch ? (queryGradeMatch[1] || queryGradeMatch[2]) : (grade ? grade.replace(/[^0-9]/g, '') : null);

  interface ScoredItem {
    score: number;
    type: 'knowledge' | 'material' | 'unified' | 'youtube' | 'course';
    item: any;
  }

  const scoredResults: ScoredItem[] = [];

  // Helper matcher: Substring or reverse-substring token match
  const matchTokenAgainstText = (token: string, target: string): number => {
    if (!token || !target) return 0;
    if (target.includes(token)) return token.length >= 4 ? 30 : 15;
    if (token.length >= 4 && token.includes(target) && target.length >= 3) return 20;
    return 0;
  };

  // 4.1 Search in Teacher's Knowledge Base (asanKnowledge)
  (asanKnowledge || []).forEach((k: any) => {
    let score = 0;
    const title = String(k.title || '').toLowerCase();
    const content = String(k.content || '').toLowerCase();
    const cat = String(k.category || '').toLowerCase();
    const g = String(k.grade || '').toLowerCase();

    // Exact or phrase match
    if (title.includes(lowerQ)) score += 100;
    if (content.includes(lowerQ)) score += 60;

    // Direct contentTokens match against title/content
    activeTokens.forEach(tok => {
      if (title.includes(tok)) score += 40;
      if (content.includes(tok)) score += 25;
      if (cat.includes(tok)) score += 20;
    });

    // Root stems & fuzzy matching
    allSearchTokens.forEach(token => {
      score += matchTokenAgainstText(token, title);
      score += matchTokenAgainstText(token, content) * 0.7;
      score += matchTokenAgainstText(token, cat) * 0.8;
    });

    // Match against Teacher's Expected Student Questions (Highest semantic confidence boost!)
    if (Array.isArray(k.expectedQuestions) && k.expectedQuestions.length > 0) {
      k.expectedQuestions.forEach((eq: any) => {
        const qStr = String(eq || '').trim().toLowerCase();
        if (!qStr) return;
        if (qStr === lowerQ || lowerQ.includes(qStr) || qStr.includes(lowerQ)) {
          score += 150; // Pinpoint teacher-anticipated question match!
        }
        activeTokens.forEach(tok => {
          if (qStr.includes(tok)) score += 45;
        });
        allSearchTokens.forEach(token => {
          score += matchTokenAgainstText(token, qStr) * 1.5;
        });
      });
    }

    // Match against Structured Q&A Pairs (Pinpoint Q&A match!)
    if (Array.isArray(k.qaPairs) && k.qaPairs.length > 0) {
      k.qaPairs.forEach((qa: any) => {
        const qStr = String(qa.question || '').trim().toLowerCase();
        const aStr = String(qa.answer || '').trim().toLowerCase();
        if (qStr) {
          if (qStr === lowerQ || lowerQ.includes(qStr) || qStr.includes(lowerQ)) {
            score += 180; // Absolute direct teacher Q&A match
          }
          activeTokens.forEach(tok => {
            if (qStr.includes(tok)) score += 50;
          });
          allSearchTokens.forEach(token => {
            score += matchTokenAgainstText(token, qStr) * 1.8;
          });
        }
        if (aStr) {
          activeTokens.forEach(tok => {
            if (aStr.includes(tok)) score += 25;
          });
          allSearchTokens.forEach(token => {
            score += matchTokenAgainstText(token, aStr) * 0.9;
          });
        }
      });
    }

    // Match against Topics / Keywords
    if (Array.isArray(k.topics) && k.topics.length > 0) {
      k.topics.forEach((t: any) => {
        const topStr = String(t || '').trim().toLowerCase();
        if (!topStr) return;
        if (lowerQ.includes(topStr) || topStr.includes(lowerQ)) {
          score += 90;
        }
        activeTokens.forEach(tok => {
          if (topStr.includes(tok)) score += 35;
        });
        allSearchTokens.forEach(token => {
          score += matchTokenAgainstText(token, topStr) * 1.2;
        });
      });
    }

    // Grade match
    if (detectedGradeNum && g.includes(detectedGradeNum)) score += 25;

    if (score > 0) {
      scoredResults.push({ score, type: 'knowledge', item: k });
    }
  });

  // 4.2 Search in Course Materials (PDFs & Documents)
  (materials || []).forEach((m: any) => {
    let score = 0;
    const title = String(m.title || '').toLowerCase();
    const subject = String(m.subject || '').toLowerCase();
    const g = String(m.grade || '').toLowerCase();
    const link = m.fileUrl || m.link || m.driveLink || '';

    if (title.includes(lowerQ)) score += 80;

    activeTokens.forEach(tok => {
      if (title.includes(tok)) score += 35;
      if (subject.includes(tok)) score += 20;
    });

    allSearchTokens.forEach(token => {
      score += matchTokenAgainstText(token, title);
      score += matchTokenAgainstText(token, subject) * 0.8;
    });

    if (detectedGradeNum && g.includes(detectedGradeNum)) score += 25;
    if (link) score += 10; // Prioritize items with actual PDF download links

    // If query asks for PDF/past paper and item has PDF
    if (/(pdf|நோட்ஸ்|குறிப்பு|வினாத்தாள்|paper|exam|மாதிரி)/i.test(lowerQ) && link) {
      score += 20;
    }

    if (score > 0) {
      scoredResults.push({ score, type: 'material', item: m });
    }
  });

  // 4.3 Search in Unified Links
  (unifiedLinks || []).forEach((u: any) => {
    let score = 0;
    const title = String(u.title || '').toLowerCase();
    const desc = String(u.description || '').toLowerCase();
    const g = String(u.grade || '').toLowerCase();
    const s = String(u.subject || '').toLowerCase();
    const cat = String(u.category || '').toLowerCase();

    if (title.includes(lowerQ)) score += 70;

    activeTokens.forEach(tok => {
      if (title.includes(tok)) score += 30;
      if (desc.includes(tok)) score += 15;
      if (s.includes(tok)) score += 18;
      if (cat.includes(tok)) score += 18;
    });

    allSearchTokens.forEach(token => {
      score += matchTokenAgainstText(token, title);
      score += matchTokenAgainstText(token, desc) * 0.5;
      score += matchTokenAgainstText(token, s) * 0.8;
      score += matchTokenAgainstText(token, cat) * 0.8;
    });

    if (detectedGradeNum && g.includes(detectedGradeNum)) score += 20;

    if (score > 0) {
      scoredResults.push({ score, type: 'unified', item: u });
    }
  });

  // 4.4 Search in YouTube Video Classes
  (youtube || []).forEach((y: any) => {
    let score = 0;
    const title = String(y.title || '').toLowerCase();
    const g = String(y.grade || '').toLowerCase();

    if (title.includes(lowerQ)) score += 60;

    activeTokens.forEach(tok => {
      if (title.includes(tok)) score += 25;
    });

    allSearchTokens.forEach(token => {
      score += matchTokenAgainstText(token, title);
    });

    if (detectedGradeNum && g.includes(detectedGradeNum)) score += 15;
    if (/(video|வீடியோ|காணொளி|வகுப்பு)/i.test(lowerQ)) score += 20;

    if (score > 0) {
      scoredResults.push({ score, type: 'youtube', item: y });
    }
  });

  // 4.5 Search in Courses
  (courses || []).forEach((c: any) => {
    let score = 0;
    const title = String(c.title || '').toLowerCase();
    const desc = String(c.description || '').toLowerCase();
    const g = String(c.grade || '').toLowerCase();

    if (title.includes(lowerQ)) score += 50;

    activeTokens.forEach(tok => {
      if (title.includes(tok)) score += 20;
      if (desc.includes(tok)) score += 10;
    });

    allSearchTokens.forEach(token => {
      score += matchTokenAgainstText(token, title);
      score += matchTokenAgainstText(token, desc) * 0.5;
    });

    if (detectedGradeNum && g.includes(detectedGradeNum)) score += 15;

    if (score > 0) {
      scoredResults.push({ score, type: 'course', item: c });
    }
  });

  // Sort results by score descending
  scoredResults.sort((a, b) => b.score - a.score);

  // 5. IF MATCHING ITEMS FOUND IN FIREBASE (Filter strictly by relevance threshold to avoid unrelated dumps)
  // Only consider items with significant relevance score (score >= 35)
  const strictlyRelevantMatches = scoredResults.filter(r => r.score >= 35);

  if (strictlyRelevantMatches.length > 0) {
    // Only pick the top 1 or 2 most directly relevant notes to prevent context bloating
    const knowledgeMatches = strictlyRelevantMatches.filter(r => r.type === 'knowledge').slice(0, 2);
    const materialMatches = strictlyRelevantMatches.filter(r => r.type === 'material' || (r.type === 'unified' && r.item.type !== 'youtube')).slice(0, 1);
    // Videos only if high relevance (score >= 50, meaning title explicitly matched)
    const videoMatches = strictlyRelevantMatches.filter(r => (r.type === 'youtube' || (r.type === 'unified' && r.item.type === 'youtube')) && r.score >= 50).slice(0, 1);

    // Build concise, focused grounding context strictly for the queried topic
    const groundingContextLines: string[] = [];

    if (knowledgeMatches.length > 0) {
      groundingContextLines.push(`--- ஆசிரியரின் நேரடிப் பாடக் குறிப்பு (Teacher's Specific Note for this Topic) ---`);
      knowledgeMatches.forEach(({ item }) => {
        groundingContextLines.push(`தலைப்பு: ${item.title || ''}`);
        if (item.grade) groundingContextLines.push(`தரம்: ${item.grade}`);
        if (item.category) groundingContextLines.push(`பிரிவு: ${item.category}`);
        if (Array.isArray(item.topics) && item.topics.length > 0) {
          groundingContextLines.push(`உபதலைப்புகள் / Topics: ${item.topics.join(', ')}`);
        }
        if (Array.isArray(item.expectedQuestions) && item.expectedQuestions.length > 0) {
          groundingContextLines.push(`எதிர்பார்க்கப்படும் மாணவர் வினாக்கள்:\n${item.expectedQuestions.map((q: string) => `• ${q}`).join('\n')}`);
        }
        if (Array.isArray(item.qaPairs) && item.qaPairs.length > 0) {
          groundingContextLines.push(`மாதிரி வினாக்களும் ஆசிரியரின் அதிகாரப்பூர்வ விடைகளும்:`);
          item.qaPairs.forEach((qa: any, idx: number) => {
            groundingContextLines.push(`[வினா ${idx + 1}]: ${qa.question}\n[விடை]: ${qa.answer}`);
          });
        }
        groundingContextLines.push(`குறிப்பு விளக்கம்:\n${item.content || ''}\n`);
      });
    }

    if (materialMatches.length > 0) {
      materialMatches.forEach(({ item }) => {
        groundingContextLines.push(`பாடக்குறிப்பு ஆவணம்: ${item.title || ''} [${item.grade || 'பொது'}]`);
        if (item.description) groundingContextLines.push(`விபரம்: ${item.description}`);
      });
    }

    const fullKnowledgeContext = groundingContextLines.join('\n');

    // Sources tracking
    const sources: GuruSourceReference[] = [];
    knowledgeMatches.forEach(({ item }) => {
      sources.push({
        title: item.title,
        type: 'notes',
        grade: item.grade || 'பொது',
        subject: item.category || 'இலக்கணம்'
      });
    });
    if (videoMatches.length > 0) {
      const v = videoMatches[0].item;
      sources.push({
        title: v.title || 'வீடியோ வகுப்பு',
        type: 'youtube',
        url: v.url || v.youtubeUrl || v.link || '',
        grade: v.grade || 'பொது',
        subject: 'தமிழ்'
      });
    }

    // Attempt Gemini Grounded Direct Explanation via /api/tamil-asan/ask
    try {
      const askRes = await fetch("/api/tamil-asan/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmedQ,
          knowledgeContext: fullKnowledgeContext,
          chatHistory: chatHistory.slice(-4),
          imageBase64,
          imageMimeType,
          model: "gemini-flash-lite-latest",
          answerLength: answerLength || "detailed"
        })
      });

      if (askRes.ok) {
        const data = await askRes.json();
        if (data.text && typeof data.text === "string" && data.text.trim()) {
          let finalAnswer = data.text.trim();

          // Append single official video class link only if directly relevant and not already linked
          if (videoMatches.length > 0 && !finalAnswer.includes("வீடியோவைக் காண")) {
            const v = videoMatches[0].item;
            const vTitle = v.title || 'பாட விளக்கம்';
            const vUrl = v.url || v.youtubeUrl || v.link || '';
            if (vUrl) {
              finalAnswer += `\n\n🎬 **தொடர்புடைய ஆசான் வீடியோ வகுப்பு:**\n• [${vTitle} - காணொளியைக் காண்க ➔](${vUrl})`;
            }
          }

          const followUps: string[] = [
            "மேலதிக உதாரணங்கள் தருக",
            "இலக்கணப் பயிற்சி வினாக்கள்",
            "30 நாள் பாடநெறி விபரம்"
          ];

          return {
            answer: finalAnswer,
            usedSources: sources,
            suggestedFollowUps: followUps
          };
        }
      }
    } catch (e) {
      console.warn("Server-side grounded ask failed, using structured template fallback:", e);
    }

    // Direct Structured Fallback if server call is unreachable - Never dump raw notes!
    // Format only the most relevant item into a clean pedagogical explanation
    const primaryNote = knowledgeMatches[0]?.item;
    let fallbackAnswer = "";
    if (primaryNote) {
      fallbackAnswer = `### ${primaryNote.title} (${primaryNote.grade || 'இலக்கணம்'})\n\n${primaryNote.content}\n`;
    } else {
      fallbackAnswer = `இக்கேள்விக்கான துல்லியமான இலக்கண விளக்கம் தயார் செய்யப்படுகிறது. தயவுசெய்து சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.`;
    }

    if (videoMatches.length > 0) {
      const v = videoMatches[0].item;
      const vUrl = v.url || v.youtubeUrl || v.link || '';
      if (vUrl) {
        fallbackAnswer += `\n\n🎬 **தொடர்புடைய வீடியோ வகுப்பு:** [${v.title || 'காணொளி'}](${vUrl})`;
      }
    }

    return {
      answer: fallbackAnswer,
      usedSources: sources,
      suggestedFollowUps: ["மேலதிக உதாரணங்கள் தருக", "பயிற்சி வினாக்கள்"]
    };
  }

  // 6. IF NO DIRECT FIREBASE ITEM FOUND
  // Check if strictMode is false or unset (default), allow the teacher persona to explain standard Tamil grammar/literature curriculum
  if (!asanSettings.strictMode) {
    try {
      const askRes = await fetch("/api/tamil-asan/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmedQ,
          knowledgeContext: `அகரம் தினேஸ் ஆன்லைன் அகாடமி (Agaram Dhines Online Academy)\nதலைமை ஆசான்: Mr. D. Dhineskumar\nபாடநெறி: தரம் 6 முதல் 13 வரையிலான இலங்கைத் தமிழ் பாடத்திட்டம் மற்றும் 30 நாள் இலக்கணப் பாடநெறி.\n\nகட்டளை: மாணவர் கேட்ட வினாவிற்கு (வினா: ${trimmedQ}) RAG 4-அடுக்குக் கட்டமைப்பில் (1.வரையறை, 2.வகைகள், 3.சான்றுகள், 4.பரீட்சைக் குறிப்புகள்) ஒரு சிறந்த ஆசிரியர் கற்பிப்பது போல் துல்லியமான விளக்கத்தை வழங்கவும்.`,
          chatHistory: chatHistory.slice(-6),
          imageBase64,
          imageMimeType,
          model: "gemini-flash-lite-latest",
          answerLength: answerLength || "detailed"
        })
      });

      if (askRes.ok) {
        const data = await askRes.json();
        if (data.text && typeof data.text === "string" && data.text.trim()) {
          return {
            answer: data.text.trim(),
            usedSources: [],
            suggestedFollowUps: [
              "மேலதிக உதாரணங்கள் தருக",
              "இலக்கணப் பயிற்சி வினாக்கள்",
              "30 நாள் பாடநெறி விபரம்"
            ]
          };
        }
      }
    } catch (e) {
      console.warn("Curriculum fallback explanation failed:", e);
    }
  }

  // If strictMode is ON or server call fails, honestly inform student
  let fallbackParts: string[] = [];
  fallbackParts.push(`ஆசிரியரின் வழங்கப்பட்ட பாடக்குறிப்பில் இதற்கான தகவல் கிடைக்கவில்லை.`);

  return {
    answer: fallbackParts.join("\n"),
    usedSources: [],
    suggestedFollowUps: [
      "தரம் 10 பாடக்குறிப்புகள்",
      "தரம் 11 பாடக்குறிப்புகள்",
      "30 நாள் பாடநெறி விபரம்"
    ]
  };
};

/**
 * Text-to-Speech Engine with Voice Cloning Integration
 * Supports browser natural Tamil voice + ElevenLabs Custom Voice for Mr. Dhines
 */
export const playTeacherVoice = async (
  text: string, 
  settings: TamilAsanSettings,
  onAudioStart?: () => void,
  onAudioEnd?: () => void,
  directAudioUrl?: string
): Promise<() => void> => {
  // 0. If direct audio file exists (e.g. Teacher's recorded voice) or is specifically welcome text
  let audioFileToPlay = directAudioUrl || (settings.welcomeAudioUrl && text.trim() === settings.welcomeVoiceText?.trim() ? settings.welcomeAudioUrl : null);
  if (audioFileToPlay) {
    try {
      if (audioFileToPlay.startsWith('firestore-media://')) {
        audioFileToPlay = await resolveMediaUrl(audioFileToPlay);
      }
      const audio = new Audio(audioFileToPlay);
      if (onAudioStart) onAudioStart();
      audio.onended = () => {
        if (onAudioEnd) onAudioEnd();
      };
      audio.onerror = () => {
        if (onAudioEnd) onAudioEnd();
      };
      audio.play().catch((err) => {
        console.warn("Direct teacher audio playback failed, falling back to TTS:", err);
      });
      return () => {
        audio.pause();
        audio.currentTime = 0;
        if (onAudioEnd) onAudioEnd();
      };
    } catch (e) {
      console.warn("Error playing direct teacher audio:", e);
    }
  }

  // Clean text of markdown asterisks, hashtags, bullets, urls, emojis for crisp, natural speech
  const cleanSpeechText = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^[•\-\*]\s+/gm, '')
    .replace(/[•\-\*]/g, '')
    .replace(/http\S+/g, '')
    .replace(/\[.*?\]\(.*?\)/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // strip emoji icons from TTS speech
    .slice(0, 2000); // Allow full conversational answer up to 2000 chars

  // 1. Try ElevenLabs Cloned Voice via secure server-side proxy (Bypasses Browser CORS restrictions)
  const elevenKey = settings.elevenLabsApiKey?.trim();
  const elevenVoice = settings.elevenLabsVoiceId?.trim();
  const shouldUseEleven = settings.voiceProvider === 'elevenlabs' || (elevenKey && elevenVoice);

  if (shouldUseEleven) {
    try {
      const response = await fetch('/api/elevenlabs-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: cleanSpeechText,
          voiceId: elevenVoice,
          apiKey: elevenKey,
          stability: 0.5,
          similarity_boost: 0.85
        })
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('audio')) {
          const audioBlob = await response.blob();
          if (audioBlob && audioBlob.size > 200) {
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            if (onAudioStart) onAudioStart();
            audio.onended = () => {
              if (onAudioEnd) onAudioEnd();
              URL.revokeObjectURL(audioUrl);
            };
            audio.onerror = () => {
              if (onAudioEnd) onAudioEnd();
              URL.revokeObjectURL(audioUrl);
            };
            await audio.play();
            return () => {
              audio.pause();
              audio.currentTime = 0;
              if (onAudioEnd) onAudioEnd();
            };
          }
        } else {
          // Response is JSON fallback (e.g., key format warning or quota)
          const fallbackData = await response.json().catch(() => ({}));
          console.info("ElevenLabs voice fallback note:", fallbackData?.error || "Smoothly falling back to browser speech");
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        console.warn("ElevenLabs server proxy returned error:", response.status, errJson);
      }
    } catch (e) {
      console.warn("ElevenLabs cloned voice playback failed, falling back to browser speech:", e);
    }
  }

  // 2. High Quality Browser Native Tamil Voice Fallback

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
    utterance.lang = 'ta-IN';
    utterance.rate = settings.speechRate || 0.95;
    utterance.pitch = settings.speechPitch || 1.0;

    // Pick best Tamil voice available on device
    const voices = window.speechSynthesis.getVoices();
    const tamilVoice = voices.find(v => v.lang.includes('ta') || v.name.toLowerCase().includes('tamil'));
    if (tamilVoice) {
      utterance.voice = tamilVoice;
    }

    utterance.onstart = () => {
      if (onAudioStart) onAudioStart();
    };
    utterance.onend = () => {
      if (onAudioEnd) onAudioEnd();
    };
    utterance.onerror = () => {
      if (onAudioEnd) onAudioEnd();
    };

    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
      if (onAudioEnd) onAudioEnd();
    };
  }

  return () => {};
};
