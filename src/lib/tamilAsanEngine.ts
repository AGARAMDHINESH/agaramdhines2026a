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
  getAllUnifiedLinks,
  getData,
  saveData
} from "./db";

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
  voiceProvider: 'browser_native',
  elevenLabsApiKey: "",
  elevenLabsVoiceId: "",
  voiceSampleUrl: "",
  welcomeAudioUrl: "",
  welcomeVoiceText: "வணக்கம் அன்பு மாணவச் செல்வங்களே! உங்களை அன்புடன் நமது அகரம் தினேஸ் அறிவுத்தளத்திற்கு அழைக்கிறோம். உங்கள் தமிழ் சந்தேகங்களை என்னிடம் கேளுங்கள், மகிழ்ச்சியுடன் விளக்குகிறேன்.",
  defaultAnswerLength: 'concise',
  speechPitch: 1.0,
  speechRate: 0.95,
  allowedGrades: ["Grade 06", "Grade 07", "Grade 08", "Grade 09", "Grade 10", "Grade 11", "Grade 12", "Grade 13"],
  strictMode: true
};

export const getTamilAsanSettings = async (): Promise<TamilAsanSettings> => {
  return getData('tamilAsanSettings', DEFAULT_TAMIL_ASAN_SETTINGS);
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
      contextLines.push(`- [${g}] [${cat}] ${item.title}: ${item.content}`);
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
  answerLength
}: {
  question: string;
  grade?: string;
  category?: string;
  imageBase64?: string;
  imageMimeType?: string;
  answerLength?: 'concise' | 'detailed';
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
    botSettings
  ] = await Promise.all([
    getCourseMaterials().catch(() => []),
    getTamilAsanKnowledge().catch(() => []),
    getAllUnifiedLinks().catch(() => []),
    getYoutubeLinks().catch(() => []),
    getCourses().catch(() => []),
    getChatbotSettings().catch(() => null)
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

  // 4. INTELLIGENT FIREBASE KNOWLEDGE RETRIEVAL
  // Extract search tokens
  const cleanTokens = lowerQ
    .replace(/[?,.!:;()\[\]"'\/\\-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2);

  // Extract grade numbers if mentioned in query or passed as prop
  const queryGradeMatch = lowerQ.match(/தரம்\s*(\d+)|grade\s*(\d+)/i);
  const detectedGradeNum = queryGradeMatch ? (queryGradeMatch[1] || queryGradeMatch[2]) : (grade ? grade.replace(/[^0-9]/g, '') : null);

  interface ScoredItem {
    score: number;
    type: 'knowledge' | 'material' | 'unified' | 'youtube' | 'course';
    item: any;
  }

  const scoredResults: ScoredItem[] = [];

  // 4.1 Search in Teacher's Knowledge Base (asanKnowledge)
  (asanKnowledge || []).forEach((k: any) => {
    let score = 0;
    const title = String(k.title || '').toLowerCase();
    const content = String(k.content || '').toLowerCase();
    const cat = String(k.category || '').toLowerCase();
    const g = String(k.grade || '').toLowerCase();

    // Exact query matches
    if (title.includes(lowerQ)) score += 80;
    if (content.includes(lowerQ)) score += 50;

    // Token matches
    cleanTokens.forEach(token => {
      if (title.includes(token)) score += 25;
      if (content.includes(token)) score += 12;
      if (cat.includes(token)) score += 15;
    });

    // Grade match
    if (detectedGradeNum && g.includes(detectedGradeNum)) score += 20;

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

    if (title.includes(lowerQ)) score += 70;

    cleanTokens.forEach(token => {
      if (title.includes(token)) score += 20;
      if (subject.includes(token)) score += 15;
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

    if (title.includes(lowerQ)) score += 60;

    cleanTokens.forEach(token => {
      if (title.includes(token)) score += 18;
      if (desc.includes(token)) score += 10;
      if (s.includes(token)) score += 12;
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

    if (title.includes(lowerQ)) score += 50;

    cleanTokens.forEach(token => {
      if (title.includes(token)) score += 15;
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

    if (title.includes(lowerQ)) score += 40;

    cleanTokens.forEach(token => {
      if (title.includes(token)) score += 12;
      if (desc.includes(token)) score += 8;
    });

    if (detectedGradeNum && g.includes(detectedGradeNum)) score += 15;

    if (score > 0) {
      scoredResults.push({ score, type: 'course', item: c });
    }
  });

  // Sort results by score descending
  scoredResults.sort((a, b) => b.score - a.score);

  // 5. IF MATCHING ITEMS FOUND IN FIREBASE
  if (scoredResults.length > 0) {
    const topMatches = scoredResults.slice(0, 8);
    const knowledgeMatches = topMatches.filter(r => r.type === 'knowledge');
    const materialMatches = topMatches.filter(r => r.type === 'material' || (r.type === 'unified' && r.item.type !== 'youtube'));
    const videoMatches = topMatches.filter(r => r.type === 'youtube' || (r.type === 'unified' && r.item.type === 'youtube'));
    const courseMatches = topMatches.filter(r => r.type === 'course');

    let answerParts: string[] = [];
    answerParts.push(`வணக்கம் அன்புச் செல்வமே! நமது அகரம் தினேஸ் அகாடமியின் Firebase அறிவுத்தளத்தில் நீங்கள் கேட்ட "${trimmedQ}" தொடர்பான தகவல்கள் கீழே தொகுக்கப்பட்டுள்ளன:\n`);

    // 5.1 Teacher's Detailed Knowledge / Notes
    if (knowledgeMatches.length > 0) {
      knowledgeMatches.slice(0, 2).forEach(({ item }) => {
        answerParts.push(`📖 **ஆசானின் பாடக் குறிப்பு & விளக்கம்:**\n**${item.title}** (${item.grade || 'பொது'})\n${item.content}\n`);
      });
    }

    // 5.2 Teacher's Official Notes & Curriculum References (NO PDF Download Links)
    if (materialMatches.length > 0) {
      answerParts.push(`📚 **பாடக் குறிப்பு ஆதாரம் (Course Reference):**`);
      materialMatches.slice(0, 5).forEach(({ item }) => {
        const title = item.title || 'பாடக்குறிப்பு';
        const gradeText = item.grade ? `[${item.grade}]` : '';
        const subjectText = item.subject ? `[${item.subject}]` : '';
        answerParts.push(`• **${title}** ${gradeText} ${subjectText} *(தலைமை ஆசிரியரின் அதிகாரப்பூர்வப் பதிவிலிருந்து)*`);
      });
      answerParts.push(``);
    }

    // 5.3 YouTube Video Classes (Permitted as requested)
    if (videoMatches.length > 0) {
      answerParts.push(`🎬 **தொடர்புடைய வீடியோ வகுப்புகள்:**`);
      videoMatches.slice(0, 3).forEach(({ item }) => {
        const title = item.title || 'வீடியோ வகுப்பு';
        const url = item.url || item.youtubeUrl || item.link || '';
        if (url) {
          answerParts.push(`• **${title}**: [வீடியோவைக் காண ➔](${url})`);
        }
      });
      answerParts.push(``);
    }

    // 5.4 Courses
    if (courseMatches.length > 0) {
      answerParts.push(`🎓 **பாடநெறிகள்:**`);
      courseMatches.slice(0, 2).forEach(({ item }) => {
        answerParts.push(`• **${item.title}**: ${item.description || ''}`);
      });
      answerParts.push(``);
    }

    // Friendly Closing
    answerParts.push(`இக்குறிப்புகளைப் படித்து தேர்வில் சிறந்த பெறுபேறுகளைப் பெற வாழ்த்துகள்! கூடுதல் விளக்கம் அல்லது பாடச் சந்தேகங்கள் தேவைப்படின், தலைமை ஆசான் திரு. D. தினேஷ்குமார் அவர்களை நேரடியாக WhatsApp (+94778054232) மூலம் தொடர்பு கொள்ளலாம்.`);

    // Suggestions based on matches (Strictly NO PDF download buttons)
    const followUps: string[] = [];
    if (videoMatches.length > 0) {
      followUps.push("வீடியோ வகுப்புகள் பார்க்க");
    }
    followUps.push("இலக்கண விளக்கம் தருக");
    followUps.push("30 நாள் பாடநெறி விபரம்");
    followUps.push("WhatsApp-ல் ஆசானைத் தொடர்பு கொள்");
    if (followUps.length < 3) {
      followUps.push("மாதிரி வினாத்தாள்கள் பார்க்க");
      followUps.push("30 நாள் பாடநெறி விபரம்");
    }

    return {
      answer: answerParts.join("\n"),
      usedSources: [],
      suggestedFollowUps: followUps.slice(0, 4)
    };
  }

  // 6. IF NO MATCHING ITEM FOUND IN FIREBASE
  // Grounded Truth Rule: NEVER call external Google Gemini or ChatGPT.
  // Honestly inform the student and show existing available topics in Firebase!
  const recentMaterials = (materials || []).slice(0, 4);

  let fallbackParts: string[] = [];
  fallbackParts.push(`வணக்கம் அன்புச் செல்வமே! நீங்கள் கேட்ட "${trimmedQ}" தொடர்பான பாடக்குறிப்பு அல்லது விளக்கம் நமது அகரம் தினேஸ் அகாடமியின் உத்தியோகபூர்வ பதிவுகளில் தற்போது இன்னும் இணைக்கப்படவில்லை.\n`);
  fallbackParts.push(`தலைமை ஆசான் திரு. D. தினேஷ்குமார் அவர்கள் விரைவில் இப்பகுதிக்குரிய பாடக்குறிப்புகளை நமது அகாடமி அறிவுத்தளத்தில் பதிவேற்றுவார்.\n`);

  if (recentMaterials.length > 0) {
    fallbackParts.push(`📚 **ஆசிரியரின் பிற முக்கிய பாடப் பதிவுகள்:**`);
    recentMaterials.forEach((m: any) => {
      fallbackParts.push(`• **${m.title}** [${m.grade || 'பொது'}] *(ஆசிரியரின் பாடப் பதிவு)*`);
    });
    fallbackParts.push(``);
  }

  fallbackParts.push(`உடனடி உதவி அல்லது பாட விளக்கம் தேவைப்படின், தலைமை ஆசானை நேரடியாக WhatsApp மூலம் தொடர்பு கொள்ளலாம்:`);
  fallbackParts.push(`📞 **WhatsApp:** 0778054232 (https://wa.me/94778054232)`);

  return {
    answer: fallbackParts.join("\n"),
    usedSources: [],
    suggestedFollowUps: [
      "தரம் 10 பாட விளக்கம்",
      "தரம் 11 பாட விளக்கம்",
      "30 நாள் பாடநெறி விபரம்",
      "WhatsApp-ல் ஆசானைத் தொடர்பு கொள்"
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
  // 0. If direct audio file exists (e.g. Teacher's recorded voice) or is welcome text
  let audioFileToPlay = directAudioUrl || (settings.welcomeAudioUrl && (text === settings.welcomeVoiceText || text.includes("வணக்கம் அன்புச் செல்வமே") || text.includes("வணக்கம் மாணவர்களே")) ? settings.welcomeAudioUrl : null);
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

  // 1. Try ElevenLabs Cloned Voice if API key and Voice ID are configured
  if (settings.voiceProvider === 'elevenlabs' && settings.elevenLabsApiKey && settings.elevenLabsVoiceId) {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${settings.elevenLabsVoiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': settings.elevenLabsApiKey
        },
        body: JSON.stringify({
          text: cleanSpeechText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.85
          }
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        if (onAudioStart) onAudioStart();
        audio.onended = () => {
          if (onAudioEnd) onAudioEnd();
          URL.revokeObjectURL(audioUrl);
        };
        audio.play().catch(() => {});
        return () => {
          audio.pause();
          audio.currentTime = 0;
          if (onAudioEnd) onAudioEnd();
        };
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
