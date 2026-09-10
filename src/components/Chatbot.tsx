import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, ImagePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getChatbotSettings } from '../lib/db';
import { GoogleGenAI } from '@google/genai';

interface Message {
  id: string;
  text: string | React.ReactNode;
  sender: 'bot' | 'user';
  timestamp: Date;
  options?: string[];
  imageUrl?: string;
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'வணக்கம்! Agaram Dhines Academy-க்கு உங்களை வரவேற்கிறோம். உங்களுக்கு எந்த வகுப்பிற்கான தகவல் வேண்டும்?',
      sender: 'bot',
      timestamp: new Date(),
      options: ['Grade 06', 'Grade 07', 'Grade 08', 'Grade 09', 'Grade 10', 'Grade 11', 'Fees', 'Contact']
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getChatbotSettings().then(data => {
      if (data) {
        const migratedData = { ...data };
        
        // Migrate old gradeXX format to grades array
        if (!migratedData.grades) {
          migratedData.grades = [];
          ['grade01', 'grade02', 'grade03', 'grade04', 'grade05', 'grade06', 'grade07', 'grade08', 'grade09', 'grade10', 'grade11', 'grade12', 'grade13'].forEach(g => {
            if (migratedData[g]) {
              // Ensure subjects exist
              let subjects = migratedData[g].subjects;
              if (!subjects) {
                subjects = [
                  {
                    id: Math.random().toString(36).substr(2, 9),
                    name: 'தமிழ்',
                    teacher: '',
                    fee: migratedData[g].fee || '',
                    startDate: migratedData[g].startDate || '',
                    time: migratedData[g].time || '',
                    features: migratedData[g].features || '',
                    contact: migratedData[g].contact || '',
                    whatsappLink: migratedData[g].whatsappLink || '',
                    registrationLink: migratedData[g].registrationLink || '',
                    imageLink: migratedData[g].imageLink || ''
                  }
                ];
              }
              migratedData.grades.push({
                id: g,
                title: migratedData[g].title || `தரம் ${g.replace('grade', '')}`,
                subjects: subjects
              });
              delete migratedData[g];
            }
          });
          
          // If still empty, add defaults 01 to 13
          if (migratedData.grades.length === 0) {
            for (let i = 1; i <= 13; i++) {
              const gradeNum = i.toString().padStart(2, '0');
              migratedData.grades.push({
                id: `grade${gradeNum}`,
                title: `தரம் ${gradeNum}`,
                subjects: []
              });
            }
          }
        }

        // Migrate contact
        if (!migratedData.contact) {
          migratedData.contact = {
            whatsapp: "0778054232",
            phone: "0778054232",
            message: "எந்தவொரு சந்தேகங்களுக்கும் எங்களை தொடர்பு கொள்ளவும்:",
            website: "",
            whatsappGroup: ""
          };
        } else {
          if (!migratedData.contact.website) migratedData.contact.website = "";
          if (!migratedData.contact.whatsappGroup) migratedData.contact.whatsappGroup = "";
        }

        // Migrate payment
        if (!migratedData.payment) {
          migratedData.payment = {
            bank: "BOC (Bank of Ceylon)",
            name: "D. Dhineskumar",
            accountNo: "84877439",
            branch: "Galaha Branch"
          };
        }

        // Migrate fees
        if (!migratedData.fees) {
          migratedData.fees = {
            items: [],
            noteTitle: "",
            noteDescription: "",
            noteFooter: ""
          };
        } else if (!migratedData.fees.items) {
          migratedData.fees.items = [];
        }

        // Migrate subjects to have duration and hasRecording
        migratedData.grades.forEach((grade: any) => {
          if (grade.subjects) {
            grade.subjects.forEach((subject: any) => {
              if (subject.duration === undefined) subject.duration = "";
              if (subject.hasRecording === undefined) subject.hasRecording = true;
            });
          }
        });

        setSettings(migratedData);
        
        // Update initial message options to match previous behavior (English buttons)
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages.length > 0 && newMessages[0].id === '1') {
            newMessages[0].options = ['Grade 06', 'Grade 07', 'Grade 08', 'Grade 09', 'Grade 10', 'Grade 11', 'Fees', 'Contact'];
          }
          return newMessages;
        });
      }
    });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const renderSubjectResponse = (subjectData: any, gradeTitle: string) => {
    if (!subjectData) return "தகவல் கிடைக்கவில்லை.";
    const contactInfo = settings?.contact || {};
    const contactPhone = subjectData.contact || contactInfo.phone || "0778054232";
    const whatsappLink = subjectData.whatsappLink || contactInfo.whatsappGroup;

    return (
      <div className="flex flex-col gap-3 w-full">
        {subjectData.imageLink && (
          <img src={subjectData.imageLink} alt={subjectData.name} className="w-full h-auto rounded-xl object-cover" />
        )}
        <div className="flex items-center gap-2 text-blue-700 font-bold">
          <span className="text-xl">🚀</span>
          <span>{gradeTitle} - {subjectData.name}</span>
        </div>
        
        <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-3">
          {subjectData.teacher && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">👨‍🏫</span>
              <span className="font-semibold text-gray-800">ஆசிரியர்:</span>
              <span className="text-gray-700">{subjectData.teacher}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-gray-600">💰</span>
            <span className="font-semibold text-gray-800">மாதக்கட்டணம்:</span>
            <span className="text-blue-600 font-bold">{subjectData.fee}</span>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-gray-600 mt-0.5">📅</span>
            <span className="text-gray-700 text-sm whitespace-pre-wrap">{subjectData.startDate}</span>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-gray-600 mt-0.5">📍</span>
            <div className="text-sm">
              <span className="font-semibold text-gray-800">வகுப்பு நேரம்:</span><br/>
              <span className="text-gray-700">{subjectData.time}</span>
            </div>
          </div>
          
          {subjectData.duration && (
            <div className="flex items-start gap-2">
              <span className="text-gray-600 mt-0.5">⏱️</span>
              <div className="text-sm">
                <span className="font-semibold text-gray-800">வகுப்பு காலம்:</span><br/>
                <span className="text-gray-700">{subjectData.duration}</span>
              </div>
            </div>
          )}
          
          <div className="flex items-start gap-2">
            <span className="text-gray-600 mt-0.5">🎥</span>
            <div className="text-sm">
              <span className="font-semibold text-gray-800">Recording:</span><br/>
              <span className="text-gray-700">{subjectData.hasRecording ? 'உண்டு (Available)' : 'இல்லை (Not Available)'}</span>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-gray-600 mt-0.5">✨</span>
            <div className="text-sm">
              <span className="font-semibold text-gray-800">சிறப்பு:</span><br/>
              <span className="text-gray-700">{subjectData.features}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-gray-600">📞</span>
            <span className="font-semibold text-gray-800">தொடர்பு:</span>
            <a href={`tel:${contactPhone}`} className="text-blue-600 hover:underline font-medium">{contactPhone}</a>
          </div>
        </div>
        
        {whatsappLink && (
          <a 
            href={whatsappLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white py-2.5 px-4 rounded-xl font-medium transition-colors shadow-sm text-sm"
          >
            <span>WhatsApp Group-ல் இணைய</span>
          </a>
        )}
        
        {subjectData.registrationLink && (
          <a 
            href={subjectData.registrationLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl font-medium transition-colors shadow-sm text-sm"
          >
            <span>வகுப்பில் இணைய பதிவு செய்க</span>
          </a>
        )}
      </div>
    );
  };

  const MAIN_MENU_OPTIONS = ['Grade 06', 'Grade 07', 'Grade 08', 'Grade 09', 'Grade 10', 'Grade 11', 'Fees', 'Contact'];

  const processBotResponse = (inputText: string): { botReply: string | React.ReactNode, options?: string[] } | null => {
    const lowerInput = inputText.toLowerCase();

    if (!settings) {
      return { botReply: "Loading...", options: ['Main Menu'] };
    }

    // First check if the input matches a specific subject selection
    for (const grade of settings.grades || []) {
      if (grade.subjects) {
        const matchedSubject = grade.subjects.find((s: any) => {
          const subjectNameLower = (s.name || '').toLowerCase();
          const gradeLabelLower = (grade.title || '').toLowerCase();
          // Match if input contains both grade label and subject name, or if it's an exact match of "Grade - Subject"
          return (lowerInput.includes(subjectNameLower) && lowerInput.includes(gradeLabelLower)) || lowerInput === `${gradeLabelLower} - ${subjectNameLower}`;
        });
        
        if (matchedSubject) {
           return { botReply: renderSubjectResponse(matchedSubject, grade.title || ''), options: ['Main Menu'] };
        }
      }
    }

    // If no specific subject matched, check for grade match
    for (const grade of settings.grades || []) {
      const gradeTitleLower = (grade.title || '').toLowerCase();
      // Extract number from grade title (e.g., "தரம் 06" -> "6", "Grade 11" -> "11")
      const gradeNumMatch = (grade.title || '').match(/\d+/);
      const gradeNum = gradeNumMatch ? parseInt(gradeNumMatch[0], 10).toString() : null;
      
      let isMatch = lowerInput.includes(gradeTitleLower);
      
      if (!isMatch && gradeNum) {
        // Match "grade 6", "grade 06", "தரம் 6", "தரம் 06"
        if (lowerInput.includes(`grade ${gradeNum}`) || 
            lowerInput.includes(`grade 0${gradeNum}`) || 
            lowerInput.includes(`தரம் ${gradeNum}`) || 
            lowerInput.includes(`தரம் 0${gradeNum}`)) {
          isMatch = true;
        } else {
          // Match "6", "6th", "6ஆம்", "6ம்" ensuring it's not part of a larger number like '11'
          const regex = new RegExp(`(^|\\D)${gradeNum}(th|st|nd|rd|ஆம்|ம்)?(\\D|$)`);
          if (regex.test(lowerInput)) {
            isMatch = true;
          }
        }
      }

      if (isMatch) {
        if (grade.subjects && grade.subjects.length > 0) {
          const options = grade.subjects.map((s: any) => `${grade.title} - ${s.name}`);
          options.push('Main Menu');
          return { botReply: 'எந்த பாடத்திற்கான தகவல் வேண்டும் என்பதை தேர்ந்தெடுக்கவும்:', options };
        } else {
          return { botReply: 'இந்த வகுப்பிற்கான பாடங்கள் இன்னும் இணைக்கப்படவில்லை.', options: ['Main Menu'] };
        }
      }
    }

    if (lowerInput.includes('fee') || lowerInput.includes('fees') || lowerInput.includes('கட்டணம்')) {
      if (!settings.fees) return { botReply: "கட்டண விபரங்கள் இன்னும் இணைக்கப்படவில்லை.", options: ['Main Menu'] };
      
      const botReply = (
        <div className="flex flex-col gap-3 w-full">
          <div className="flex items-center gap-2 text-blue-700 font-bold">
            <span className="text-xl">💰</span>
            <span>{settings.fees.noteTitle || 'கட்டண விபரங்கள்'}</span>
          </div>
          
          <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-2 text-sm shadow-sm">
            {(settings.fees.items || []).map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                <span className="text-gray-700 font-medium">{item.label}</span>
                <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{item.amount}</span>
              </div>
            ))}
          </div>
          
          {(settings.fees.noteDescription || settings.fees.noteFooter) && (
            <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-100 text-xs text-gray-700">
              {settings.fees.noteDescription && <p className="leading-relaxed">{settings.fees.noteDescription}</p>}
              {settings.fees.noteFooter && (
                <div className="mt-2 flex items-start gap-1.5 bg-white p-2 rounded-lg border border-blue-100">
                  <span className="text-blue-500">ℹ️</span>
                  <p className="font-medium text-blue-700">{settings.fees.noteFooter}</p>
                </div>
              )}
            </div>
          )}

          {settings.payment && (
            <div className="bg-green-50/80 p-3 rounded-xl border border-green-100 text-sm mt-2">
              <div className="font-bold text-green-800 mb-2 flex items-center gap-2">
                <span>🏦</span> PAYMENT DETAILS
              </div>
              <div className="space-y-1 text-gray-700">
                <p><span className="font-semibold">BANK:</span> {settings.payment.bank}</p>
                <p><span className="font-semibold">NAME:</span> {settings.payment.name}</p>
                <p><span className="font-semibold">ACCOUNT NO:</span> {settings.payment.accountNo}</p>
                <p><span className="font-semibold">BRANCH:</span> {settings.payment.branch}</p>
              </div>
            </div>
          )}
        </div>
      );
      return { botReply, options: ['Main Menu'] };
    } else if (lowerInput.includes('class') || lowerInput.includes('வகுப்பு') || lowerInput.includes('வகுப்ப') || lowerInput.includes('course') || lowerInput.includes('courses')) {
      return { 
        botReply: 'எந்த வகுப்பிற்கான தகவல் வேண்டும் என்பதை தேர்ந்தெடுக்கவும்:', 
        options: MAIN_MENU_OPTIONS 
      };
    } else if (lowerInput.includes('hi') || lowerInput.includes('hello') || lowerInput.includes('வணக்கம்')) {
      return { 
        botReply: 'வணக்கம்! உங்களுக்கு என்ன தகவல் வேண்டும்?', 
        options: MAIN_MENU_OPTIONS 
      };
    } else if (lowerInput.includes('contact') || lowerInput.includes('தொடர்பு')) {
      if (!settings.contact) return { botReply: "தொடர்பு விபரங்கள் இன்னும் இணைக்கப்படவில்லை.", options: ['Main Menu'] };
      
      const botReply = (
        <div className="flex flex-col gap-3 w-full">
          <div className="flex items-center gap-2 text-blue-700 font-bold">
            <span className="text-xl">📞</span>
            <span>தொடர்பு கொள்ள</span>
          </div>
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col items-center justify-center gap-2">
            <p className="text-gray-700 text-sm text-center mb-2">{settings.contact.message || 'எந்தவொரு சந்தேகங்களுக்கும் எங்களை தொடர்பு கொள்ளவும்:'}</p>
            
            {settings.contact.whatsapp && (
              <a 
                href={`https://wa.me/${settings.contact.whatsapp.replace(/\D/g, '')}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white py-2.5 px-6 rounded-xl font-medium transition-colors shadow-sm w-full"
              >
                <span>WhatsApp: {settings.contact.whatsapp}</span>
              </a>
            )}
            
            {settings.contact.phone && (
              <a 
                href={`tel:${settings.contact.phone}`} 
                className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-800 py-2.5 px-6 rounded-xl font-medium transition-colors shadow-sm border border-gray-200 w-full mt-1"
              >
                <span>Call: {settings.contact.phone}</span>
              </a>
            )}
            
            {settings.contact.website && (
              <a 
                href={settings.contact.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-6 rounded-xl font-medium transition-colors shadow-sm w-full mt-1"
              >
                <span>🌐 Website</span>
              </a>
            )}
            
            {settings.contact.whatsappGroup && (
              <a 
                href={settings.contact.whatsappGroup} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white py-2.5 px-6 rounded-xl font-medium transition-colors shadow-sm w-full mt-1"
              >
                <span>👥 General WhatsApp Group</span>
              </a>
            )}
          </div>
        </div>
      );
      return { botReply, options: ['Main Menu'] };
    } else if (lowerInput.includes('main menu') || lowerInput.includes('menu')) {
      return { 
        botReply: 'உங்களுக்கு எந்த வகுப்பிற்கான தகவல் வேண்டும்?', 
        options: MAIN_MENU_OPTIONS 
      };
    }

    return null;
  };

  const handleUserMessage = async (text: string, imageFile: File | null = null) => {
    if (!text.trim() && !imageFile) return;

    let imageUrl = '';
    let base64Data = '';
    let mimeType = '';

    if (imageFile) {
      imageUrl = URL.createObjectURL(imageFile);
      const reader = new FileReader();
      base64Data = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(imageFile);
      });
      mimeType = imageFile.type;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
      imageUrl
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setSelectedImage(null);
    setIsTyping(true);

    try {
      let botReply: string | React.ReactNode = '';
      let options: string[] | undefined = undefined;

      // Check hardcoded responses first if no image is uploaded
      if (!imageFile) {
        const hardcoded = processBotResponse(text);
        if (hardcoded) {
          botReply = hardcoded.botReply;
          options = hardcoded.options;
        }
      }

      // Fallback to Gemini AI if no hardcoded response or if an image is uploaded
      if (!botReply) {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
          botReply = 'மன்னிக்கவும், எனக்கு புரியவில்லை. கீழே உள்ள விருப்பங்களில் ஒன்றைத் தேர்ந்தெடுக்கவும் அல்லது எங்களை தொடர்பு கொள்ளவும்: 0756452527';
          options = ['Grade 06', 'Grade 07', 'Grade 08', 'Grade 09', 'Grade 10', 'Grade 11', 'Fees', 'Contact'];
        } else {
          const ai = new GoogleGenAI({ apiKey });
          const parts: any[] = [];
          
          if (imageFile && base64Data) {
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            });
          }
          
          if (text.trim()) {
            parts.push({ text: text + " (You are a helpful assistant for Agaram Dhines Academy. Answer in Tamil or English based on the user's language. Keep it concise. Do not use markdown formatting like bold or italics if possible, just plain text.)" });
          } else if (imageFile) {
            parts.push({ text: "Please describe this image or answer based on it. (You are a helpful assistant for Agaram Dhines Academy. Answer in Tamil or English based on the user's language.)" });
          }

          const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-preview",
            contents: { parts }
          });

          botReply = response.text || "மன்னிக்கவும், எனக்கு புரியவில்லை.";
          
          options = MAIN_MENU_OPTIONS;
        }
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: botReply,
        sender: 'bot',
        timestamp: new Date(),
        options
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error("Gemini API Error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "மன்னிக்கவும், ஒரு பிழை ஏற்பட்டுள்ளது. மீண்டும் முயற்சிக்கவும்.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    handleUserMessage(inputValue, selectedImage);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        drag
        dragMomentum={false}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl z-40 flex items-center justify-center cursor-grab active:cursor-grabbing ${isOpen ? 'hidden' : 'flex'}`}
      >
        <MessageSquare size={28} />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col border border-gray-200"
            style={{ height: '500px', maxHeight: '80vh' }}
          >
            {/* Header */}
            <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 p-2 rounded-full">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-bold">Agaram Bot</h3>
                  <p className="text-xs text-blue-100">Online</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`flex gap-2 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'}`}>
                      {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                    </div>
                    <div 
                      className={`p-3 rounded-2xl ${
                        msg.sender === 'user' 
                          ? 'bg-blue-600 text-white rounded-tr-none' 
                          : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
                      }`}
                    >
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt="Uploaded" className="max-w-full h-auto rounded-lg mb-2" style={{ maxHeight: '150px' }} />
                      )}
                      <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
                      <p className={`text-[10px] mt-1 ${msg.sender === 'user' ? 'text-blue-200 text-right' : 'text-gray-400'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  {msg.options && msg.options.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 ml-10">
                      {msg.options.map((opt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleUserMessage(opt)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full text-xs font-medium transition-colors text-left"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex flex-col items-start">
                  <div className="flex gap-2 max-w-[85%] flex-row">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gray-200 text-gray-600">
                      <Bot size={16} />
                    </div>
                    <div className="p-3 rounded-2xl bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-gray-100 flex flex-col gap-2">
              {selectedImage && (
                <div className="relative inline-block w-16 h-16">
                  <img src={URL.createObjectURL(selectedImage)} alt="Preview" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-gray-500 hover:text-blue-600 p-2 rounded-full hover:bg-gray-100 transition-colors shrink-0"
                  title="Upload Image"
                >
                  <ImagePlus size={20} />
                </button>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-full px-4 py-2 text-sm transition-all"
                />
                <button 
                  type="submit"
                  disabled={!inputValue.trim() && !selectedImage}
                  className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
