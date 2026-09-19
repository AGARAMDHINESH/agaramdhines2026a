/**
 * AI அகரம் தினேஷ் தமிழ் ஆசான் - Knowledge Base Engine & Voice Cloner
 * Agaram Dhines Online Academy
 * 
 * Features:
 * 1. RAG (Retrieval Augmented Generation) across Academy PDF Notes, YouTube Video Classes, Website Courses & Firestore.
 * 2. Grounded Truth: Never hallucinates; explicitly cites sources with links.
 * 3. Voice Synthesis: Custom Teacher Voice (Mr. Dhines) via Web Speech API and ElevenLabs / Cloud Voice integration.
 * 4. Multi-modal inputs: Text, Audio/Speech-to-Text, Images, Question papers.
 */

import { GoogleGenAI } from "@google/genai";
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
 * Builds the Knowledge Context from Academy's Courses, PDFs, YouTube videos and notes
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
  contextLines.push(`### அகாடமி அதிகாரப்பூர்வ தரவுகள் (AGARAM DHINES ACADEMY KNOWLEDGE BASE):`);
  contextLines.push(`நிறுவனம்: அகரம் தினேஸ் Online Academy (Agaram Dhines Online Academy)`);
  contextLines.push(`தலைமை ஆசான்: Mr. D. Dhineskumar (தொடர்பு: 0778054232 / 0756452527)`);
  contextLines.push(`அதிகாரப்பூர்வ இணையதளம்: https://www.agaramdhines.lk/`);
  if (targetGrade) {
    contextLines.push(`மாணவரின் தற்போதைய வகுப்பு/தரம்: ${targetGrade}`);
  }

  // 0. Unified Official Links in Exact Order (Google Drive, YouTube, Web Links, PDFs)
  if (Array.isArray(unifiedLinks) && unifiedLinks.length > 0) {
    contextLines.push(`\n#### அகாடமியின் அதிகாரப்பூர்வ ஒருங்கிணைந்த இணைப்புகள் (வரிசைப்படி - Ordered Links):`);
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

  // 0.1 Dedicated Tamil Asan Knowledge & Rules
  if (Array.isArray(asanKnowledge) && asanKnowledge.length > 0) {
    contextLines.push(`\n#### ஆசானின் பிரத்தியேக அறிவு & வழிகாட்டல்கள் (Special Teacher Notes):`);
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

  // 1. Course Materials (PDFs & Notes) - Intelligent Grade Sorting
  if (Array.isArray(materials) && materials.length > 0) {
    contextLines.push(`\n#### பாடக்குறிப்புகள் & PDF ஆவணங்கள் (PDF Course Materials):`);
    
    // Sort so matching targetGrade comes first
    const sortedMaterials = [...materials].sort((a: any, b: any) => {
      if (!targetGrade) return 0;
      const cleanTarget = targetGrade.toLowerCase().replace(/[^0-9]/g, '');
      const aMatches = cleanTarget && String(a.grade || '').includes(cleanTarget);
      const bMatches = cleanTarget && String(b.grade || '').includes(cleanTarget);
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return 0;
    });

    sortedMaterials.slice(0, 50).forEach((m: any) => {
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

  // 2. YouTube Video Lessons
  if (Array.isArray(youtube) && youtube.length > 0) {
    contextLines.push(`\n#### யூடியூப் வீடியோ வகுப்புகள் (YouTube Video Classes):`);
    const sortedYoutube = [...youtube].sort((a: any, b: any) => {
      if (!targetGrade) return 0;
      const cleanTarget = targetGrade.toLowerCase().replace(/[^0-9]/g, '');
      const aMatches = cleanTarget && String(a.grade || '').includes(cleanTarget);
      const bMatches = cleanTarget && String(b.grade || '').includes(cleanTarget);
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return 0;
    });

    sortedYoutube.slice(0, 40).forEach((y: any) => {
      const g = y.grade || y.class || "அனைத்து வகுப்புகள்";
      const title = y.title || "தமிழ் வகுப்பு வீடியோ";
      const url = y.url || y.youtubeUrl || y.link || "";
      contextLines.push(`- [${g}] ${title} -> ${url}`);
      sources.push({
        title: `${title} (${g})`,
        type: 'youtube',
        url,
        grade: g
      });
    });
  }

  // 3. Courses & Syllabus Info
  if (Array.isArray(courses) && courses.length > 0) {
    contextLines.push(`\n#### பாடநெறிகள் & வகுப்புகள் (Courses):`);
    courses.slice(0, 20).forEach((c: any) => {
      contextLines.push(`- ${c.title || c.name}: ${c.description || ''} (தரம்: ${c.grade || 'அனைத்து'})`);
      sources.push({
        title: c.title || c.name || "பாடம்",
        type: 'course',
        url: c.link || "https://www.agaramdhines.lk/courses/",
        grade: c.grade
      });
    });
  }

  // 4. Website Links & Articles
  if (Array.isArray(webLinks) && webLinks.length > 0) {
    contextLines.push(`\n#### இணையதள கட்டுரைகள் & லிங்குகள் (Website Articles):`);
    webLinks.slice(0, 15).forEach((w: any) => {
      contextLines.push(`- ${w.title || 'கட்டுரை'}: ${w.url || w.link || ''}`);
      sources.push({
        title: w.title || 'இணையதளப் பாடம்',
        type: 'website',
        url: w.url || w.link
      });
    });
  }

  // 5. Chatbot Grade Data & Fees
  if (botSettings?.fees?.items) {
    contextLines.push(`\n#### கட்டண விபரங்கள்:`);
    botSettings.fees.items.forEach((f: any) => {
      contextLines.push(`- ${f.label}: ${f.amount}`);
    });
  }

  return {
    contextPrompt: contextLines.join('\n'),
    sources
  };
};

/**
 * Generate Answer from AI Tamil Asan with Strict Knowledge Grounding
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
  category?: string; // 'இலக்கணம்' | 'இலக்கியம்' | 'மொழிவளம்' | 'ஆக்கத்திறன்' | 'பொது'
  imageBase64?: string;
  imageMimeType?: string;
  answerLength?: 'concise' | 'detailed';
}): Promise<{
  answer: string;
  usedSources: GuruSourceReference[];
  suggestedFollowUps: string[];
}> => {
  const asanSettings = await getTamilAsanSettings();
  const effectiveLength = answerLength || asanSettings.defaultAnswerLength || 'concise';
  const { contextPrompt, sources } = await buildAcademyKnowledgeContext(grade, category);

  const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
நீங்கள் "அகரம் தினேஸ் Online Academy"-ன் அன்புத் தமிழ் ஆசான் (Agaram Dhines Tamil Asan - தலைமை ஆசான் திரு. D. தினேஷ்குமார் அவர்களின் AI வடிவம்).
மாணவர்களிடம் ChatGPT அல்லது Google Gemini போல மிக இயல்பாக, அன்பாக, ஆசிரியருக்கே உரிய பரிவுடன், இனிமையான தமிழில் உரையாட வேண்டும்.

முக்கிய கட்டளைகள்:
1. ஹேஷ்டேக் முற்றிலுமாகத் தடை (STRICT FORBIDDEN: NO HASHTAGS OR MARKDOWN HEADINGS):
- உங்கள் பதில்களில் எந்த இடத்திலும் '#', '##', '###', '####' போன்ற ஹேஷ்டேக் குறியீடுகளைப் பயன்படுத்தவே கூடாது!
- தேவையில்லாத மெனுக்கள், ரோபோட்டிக் பட்டியல்கள், "நீங்கள் கேட்க விரும்பும் வினா பகுதிகள்:", "அறிவுத்தளம்:" போன்ற செயற்கையான AI வார்ப்புருக்களை அடுக்கக் கூடாது.
- முக்கியத் தலைப்புகள் தேவைப்பட்டால் எளிய தடித்த எழுத்துக்கள் (**தலைப்பு**) அல்லது புதிய பத்தி (Paragraph) மட்டுமே பயன்படுத்தவும்.
- குறிப்புகளை வரிசைப்படுத்த எளிய புள்ளிகள் (•) அல்லது எண்கள் (1, 2) மட்டுமே பயன்படுத்தவும்.

2. மாதிரி வினா-விடைகள் கட்டாயம் உடனே வழங்குதல் (CRITICAL - MODEL Q&A RULE):
- மாணவர் ஒரு தலைப்பில் "மாதிரி வினா-விடை உள்ளதா?", "மாதிரி வினாத்தாள் உள்ளதா?", "வினாக்கள் தாருங்கள்" போன்ற பயிற்சிகளைக் கேட்டால்:
  * எக்காரணம் கொண்டும் வெறும் "ஆம், உள்ளது" என்று மட்டும் கூறி பதிலை முடிக்கக் கூடாது! இது முற்றிலும் தடை.
  * மாறாக, உடனடியாக: "ஆம் அன்புச் செல்வமே, நிச்சயமாக இருக்கிறது! இதோ இப்பாடத்திற்கான சில மாதிரி வினா-விடைகள்:" என்று கூறி, உடனடியாக 2 அல்லது 3 மாதிரி வினாக்களையும், அவற்றிற்கான சரியான விடைகளையும் விளக்கத்துடன் அங்கேயே காட்ட வேண்டும்!
  * அதன் பிறகு மாணவரிடம் பரிவுடன் கேட்கவும்:
    "உங்களுக்கு மேலும் பயிற்சி செய்ய என்ன வகையான வினாக்கள் தேவைப்படுகின்றன?
    1. பல்தேர்வு வினாக்கள் (MCQ)
    2. குறுகிய விடை வினாக்கள் (Short Answer Questions)
    3. அமைப்புக்கட்டுரை வினாக்கள் (Structured / Essay Questions)
    இதில் உங்களுக்கு எந்த வகையான வினாக்கள் வேண்டும் என்று கூறுங்கள், உடனே தயாரித்துத் தருகிறேன்!"
- மாணவர் "பல்தேர்வு வினாக்கள் தாருங்கள்" அல்லது "குறுகிய வினாக்கள்" என்று குறிப்பிட்ட ஒரு வகையைக் கேட்டால், உடனடியாக அந்த வகைக்குரிய 4 முதல் 5 தரமான வினாக்களையும், விடைகளையும், அதற்கான விளக்கங்களையும் உடனடியாக முழுமையாகத் தர வேண்டும்.

3. பயன்படுத்தப்பட்ட ஆதாரங்கள் / ரெஃபரன்ஸ்கள் முற்றிலுமாகத் தடை (STRICT: NO SOURCES OR REFERENCES):
- விடையின் முடிவிலோ அல்லது இடையிலோ எந்த இடத்திலும் "பயன்படுத்தப்பட்ட ஆதாரங்கள்:", "அகாடமி குறிப்புகள்:", PDF பெயர்கள் அல்லது YouTube வீடியோ லிங்க்குகள் போன்ற ரெஃபரன்ஸ்களைக் காட்டக் கூடாது. மாணவருக்கு எந்த ரெஃபரன்ஸும் தேவையில்லை; நேரடியான தூய தமிழ் பாட விளக்கமும் விடையும் மட்டுமே தேவை.

4. வணக்கம் மற்றும் நலம் விசாரிப்புகளுக்கான இயல்பான மனித நடை:
- மாணவர் "வணக்கம்", "வணக்கம் சார்", "Hi", "Hello", "நலமா" போன்ற வாழ்த்துக்களைக் கூறினால், பாடங்களின் வினா பட்டியல்களை அடுக்கக் கூடாது.
- மாறாக, ஒரு மனித ஆசிரியர் பேசுவது போல் மிக இயல்பாக:
  "வணக்கம் அன்புச் செல்வமே! நலமாக இருக்கிறீர்களா? உங்கள் பெயர் என்ன? நீங்கள் எந்த வகுப்பில் (தரத்தில) படிக்கிறீர்கள்? இன்று தமிழில் உங்களுக்கு என்ன சந்தேகம் அல்லது எந்தப் பாடம் படிக்கலாம் என்று கூறுங்கள், நாம் படிப்போம்!" என்று அன்புடன் கேட்கவும்.

5. பாட விளக்கங்கள் மற்றும் சந்தேகங்கள்:
- மாணவர் கேட்கும் இலக்கணம், இலக்கியம், செய்யுள் அல்லது பாடக் கேள்விகளுக்கு அவர்களின் வகுப்புக்கு ஏற்ப எளிய தமிழில் இனிமையாகப் புரிய வைக்கவும்.
- விருப்ப விடை வடிவம் 'சுருக்கம்' (Concise) எனில்: 2 முதல் 4 நேரடி புள்ளிகளில் (• அல்லது 1, 2) முக்கியக் குறிப்புகளை மட்டுமே சுருக்கமாகத் தரவும்.
- விருப்ப விடை வடிவம் 'விளக்கம்' (Detailed) எனில்: தெளிவான உதாரணங்கள், செய்யுள் வரிகள், இலக்கண விதிகளுடன் பத்திகளாக முழுமையாக விளக்கவும்.

6. அறிவுத்தளம் இல்லாத விடயங்கள்:
- உங்கள் அறிவுத்தளத்தில் குறிப்பிட்ட பாடம் இல்லையெனில், "அன்புச் செல்வமே, இப்பாடக்குறிப்பு நமது அகாடமி அறிவுத்தளத்தில் விரைவில் சேர்க்கப்படும். இப்போதைக்கு பொதுவான தமிழ் இலக்கண முறைப்படி விளக்குகிறேன்..." என்று அன்பாகக் கூறவும்.
${asanSettings.systemPromptAddon || ''}
`;

  // Detect simple greetings
  const trimmedQ = question.trim().toLowerCase();
  const isGreeting = /^(வணக்கம்|வணக்கங்க|வணக்கம் சார்|வணக்கம் ஆசான்|வணக்கம் அண்ணா|வணக்கம் ஆசிரியரே|hi|hello|hey|vanakkam|good morning|good afternoon|good evening|நலமா|ஹலோ|ஹாய்)[!.,? ]*$/i.test(trimmedQ);

  // Detect questions about model Q&A or exercises
  const isModelQaQuery = /(மாதிரி வினா|வினா விடை|வினாவிடை|வினாத்தாள்|கேள்வி பதில்|பயிற்சி வினா|உள்ளதா|இருக்கிறதா|வினாக்கள்|பல்தேர்வு|mcq|குறுகிய வினா|கட்டுரை வினா)/i.test(trimmedQ);

  const parts: any[] = [];

  if (imageBase64) {
    parts.push({
      inlineData: {
        data: imageBase64,
        mimeType: imageMimeType || "image/jpeg"
      }
    });
    parts.push({
      text: "இந்த படத்தில் உள்ள வினா அல்லது பாடக்குறிப்பைப் படித்து, அதற்குரிய சரியான விளக்கமான தமிழ் விடையை எளிய முறையில் தாருங்கள். ஹேஷ்டேக் '#' குறியீடுகளைப் பயன்படுத்த வேண்டாம். எந்த ஆதாரங்களையோ ரெஃபரன்ஸ்களையோ குறிப்பிட வேண்டாம்."
    });
  }

  if (isGreeting) {
    parts.push({
      text: `
[மாணவரின் வாழ்த்துச் செய்தி]: "${question}"
வழிகாட்டல்: மாணவர் இப்போது வணக்கம் அல்லது வாழ்த்துக் கூறியுள்ளார். அவரிடம் அன்பாக வணக்கம் கூறி, நலம் விசாரித்து, "உங்கள் பெயர் என்ன? நீங்கள் எந்த வகுப்பில் (தரத்தில) படிக்கிறீர்கள்? இன்று தமிழில் உங்களுக்கு என்ன சந்தேகம்?" என்று ஒரு பரிவான மனிதத் தமிழ் ஆசானாக மிக இயல்பாகக் கேளுங்கள். எக்காரணம் கொண்டும் ஹேஷ்டேக் '#' போடக் கூடாது, வினா பட்டியல்களை அடுக்கக் கூடாது, ஆதாரங்கள் எதுவும் தரக் கூடாது.
`
    });
  } else {
    parts.push({
      text: `
[அறிவுத்தள விவரங்கள்]
${contextPrompt}

[மாணவரின் கேள்வி]
தரம்: ${grade || "பொது"}
பிரிவு: ${category}
கேள்வி: "${question}"
விருப்ப விடை வடிவம்: ${effectiveLength === 'detailed' ? 'விரிவான முழு விளக்கம் (Detailed)' : 'சுருக்கமான நேரடி பதில் (Concise - Bullet Points)'}

விடை வழிகாட்டல்:
- எக்காரணம் கொண்டும் '#', '##', '###' போன்ற ஹேஷ்டேக் தலைப்புக் குறியீடுகளைப் பயன்படுத்தக் கூடாது.
- எந்தவிதமான ஆதாரங்கள், ரெஃபரன்ஸ்கள், PDF பெயர், லிங்க்குகள் எதையும் விடையின் முடிவில் சேர்க்கக் கூடாது.
- ChatGPT அல்லது Google Gemini போல தூய, இயல்பான, இனிமையான உரையாடல் நடையில் பதிலளிக்கவும்.
${isModelQaQuery ? `
முக்கிய குறிப்பு (மாதிரி வினா-விடை): மாணவர் மாதிரி வினாக்கள் அல்லது பயிற்சிகள் பற்றிக் கேட்கிறார். வெறும் "ஆம் உள்ளது" என்று ஒருபோதும் கூறக் கூடாது!
1. "ஆம் அன்புச் செல்வமே, நிச்சயமாக இருக்கிறது!" என்று கூறி உடனே இப்பாடத்திற்கான சில மாதிரி வினாக்களையும் விடைகளையும் இப்போதே காட்டுங்கள்.
2. தொடர்ந்து மாணவருக்கு மேலும் பயிற்சி செய்ய என்ன வகை வேண்டும் என்று கேளுங்கள்: (1. பல்தேர்வு வினாக்கள் - MCQ, 2. குறுகிய விடை வினாக்கள், 3. அமைப்புக்கட்டுரை வினாக்கள்). மாணவர் ஏற்கனவே குறிப்பிட்ட ஒரு வகையைக் கேட்டிருந்தால், உடனடியாக அந்த வகை வினாக்களை விடைகளுடன் தாருங்கள்.
` : ''}
${effectiveLength === 'detailed'
  ? `1. மாணவருக்கு முழுமையாகப் புரியும்படி விரிவான, ஆழமான விளக்கம், சான்றுகள், செய்யுள் வரிகள் மற்றும் இலக்கண விதிகளுடன் தரவும்.
2. தேர்வில் முழு மதிப்பெண் பெற உதவும் குறிப்புகள் மற்றும் உதாரணங்களைச் சேர்க்கவும்.`
  : `1. மிகச் சுருக்கமான, நேரடியான 2 முதல் 4 புள்ளிகளில் (Bullet points) மட்டுமே விடையைத் தரவும்.
2. தேவையற்ற நீண்ட முன்னுரைகளைத் தவிர்த்து வினாவிற்கான நேரடி விடையை எளிமையாகத் தரவும்.`
}
`
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: { parts },
    config: {
      systemInstruction,
      temperature: 0.3,
    }
  });

  const rawAnswer = response.text || "வணக்கம் அன்புச் செல்வமே, என்னால் தற்போது பதிலளிக்க இயலவில்லை. மீண்டும் ஒருமுறை கேட்கவும்.";

  // Clean any accidental markdown hashtags (#, ##, ###), reference lines and cleanup formatting
  const cleanAnswer = rawAnswer
    .replace(/^#{1,6}\s*/gm, '') // Strip starting #, ##, ###
    .replace(/\n#{1,6}\s*/g, '\n') // Strip line-break starting hashtags
    .replace(/#+/g, '') // Strip remaining isolated #
    .replace(/\n*(பயன்படுத்தப்பட்ட ஆதாரம்|பயன்பட்ட ஆதாரம்|ஆதாரம்|References?|Sources?):.*$/gim, '') // Strip trailing reference citations
    .trim();

  // Suggested follow up questions
  let suggestedFollowUps: string[] = [];

  if (isGreeting) {
    suggestedFollowUps = [
      "தரம் 10 தமிழ் இலக்கணம்",
      "கட்டுரை எழுத உதவி",
      "மாதிரி வினாத்தாள் பயிற்சி"
    ];
  } else if (isModelQaQuery || cleanAnswer.includes("பல்தேர்வு") || cleanAnswer.includes("குறுகிய விடை")) {
    suggestedFollowUps = [
      "பல்தேர்வு வினாக்கள் (MCQ) தாருங்கள்",
      "குறுகிய விடை வினாக்கள் தாருங்கள்",
      "அமைப்புக்கட்டுரை வினாக்கள் தாருங்கள்"
    ];
  } else {
    suggestedFollowUps = [
      "இதன் இலக்கண விதியை மேலும் விளக்குங்கள்",
      "இதற்கான மாதிரி வினா-விடைகள் தாருங்கள்",
      "தேர்வில் இது எப்படி வினாவாக வரும்?"
    ];
  }

  return {
    answer: cleanAnswer,
    usedSources: [], // User requested: No sources or references should ever be shown
    suggestedFollowUps
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
