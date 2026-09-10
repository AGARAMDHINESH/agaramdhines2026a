import React, { useState, useEffect, useRef } from "react";
import { getChatMessages, saveChatMessages, getStudents, getStaffs, getClasses } from "../lib/db";
import { Send, User, Shield, GraduationCap, Clock, MessageCircle, Image as ImageIcon, Mic, Video, X, Square, BookOpen, Check, CheckCheck, ArrowLeft } from "lucide-react";
import WhatsAppIcon from "./WhatsAppIcon";

export default function LiveChat({ currentUser, onClose }: { currentUser: { id: string, name: string, role: string, grade?: string }, onClose?: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeChat, setActiveChat] = useState("global");
  const [users, setUsers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const isFirstLoadRef = useRef(true);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    setIsNearBottom(scrollHeight - scrollTop - clientHeight < 200);
  };

  useEffect(() => {
    loadData().then(() => {
      if (isFirstLoadRef.current) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
          isFirstLoadRef.current = false;
        }, 100);
      }
    });
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Always scroll to bottom when changing chats
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      setIsNearBottom(true);
    }, 50);
  }, [activeChat]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive, if user is near bottom
    if (isNearBottom && messages.length > 0 && !isFirstLoadRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages[messages.length - 1]?.id]);

  // Mark messages as read
  useEffect(() => {
    if (messages.length === 0) return;

    let hasChanges = false;
    const updatedMessages = messages.map(msg => {
      const isRelevantChat = 
        (activeChat === 'global' && (msg.recipientId === 'global' || !msg.recipientId)) ||
        (activeChat === msg.recipientId) ||
        (msg.senderId === activeChat && msg.recipientId === currentUser.id); // DM from them

      if (isRelevantChat && msg.senderId !== currentUser.id) {
        const readBy = msg.readBy || [];
        if (!readBy.includes(currentUser.id)) {
          hasChanges = true;
          return { ...msg, readBy: [...readBy, currentUser.id] };
        }
      }
      return msg;
    });

    if (hasChanges) {
      setMessages(updatedMessages);
      saveChatMessages(updatedMessages);
    }
  }, [messages, activeChat, currentUser.id]);

  const loadData = async () => {
    const [msgs, studentsData, staffsData, classesData] = await Promise.all([
      getChatMessages(),
      getStudents(),
      getStaffs(),
      getClasses()
    ]);
    setMessages(msgs || []);
    setClasses(classesData || []);
    
    // Combine users for DM list
    const allUsers = [
      ...(studentsData || []).map((s: any) => ({ ...s, role: 'Student' })),
      ...(staffsData || []).map((s: any) => ({ ...s, role: s.role || 'Staff' }))
    ].filter(u => u.id && u.id !== currentUser.id);
    
    setUsers(allUsers);
  };

  const handleSend = async (e?: React.FormEvent, attachment?: any) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !attachment) return;

    const msg = {
      id: Date.now().toString(),
      text: newMessage.trim(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      recipientId: activeChat,
      timestamp: new Date().toISOString(),
      readBy: [currentUser.id],
      ...attachment
    };

    const updatedMessages = [...messages, msg];
    setMessages(updatedMessages);
    setNewMessage("");
    await saveChatMessages(updatedMessages);
    
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const max_size = 600;
          
          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.5 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
          handleSend(undefined, { image: dataUrl });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          handleSend(undefined, { audio: reader.result });
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const handleZoomShare = () => {
    const link = prompt("Enter Zoom Meeting Link:");
    if (link) {
      handleSend(undefined, { zoomLink: link, text: "Join my Zoom Meeting!" });
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin': return <Shield size={14} className="text-red-500" />;
      case 'Staff': return <User size={14} className="text-blue-500" />;
      case 'Student': return <GraduationCap size={14} className="text-green-500" />;
      default: return <User size={14} className="text-gray-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'Staff': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Student': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (activeChat === 'global') return msg.recipientId === 'global' || !msg.recipientId;
    if (activeChat === 'group_students') return msg.recipientId === 'group_students';
    if (activeChat === 'group_staff') return msg.recipientId === 'group_staff';
    
    if (activeChat && activeChat.startsWith('class_')) {
      return msg.recipientId === activeChat;
    }
    
    // Direct messages
    return (msg.senderId === currentUser.id && msg.recipientId === activeChat) ||
           (msg.senderId === activeChat && msg.recipientId === currentUser.id);
  });

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex w-full md:w-64 bg-slate-50 border-r border-slate-200 flex-col`}>
        <div className="p-4 border-b border-slate-200 bg-white">
          <h3 className="font-bold text-slate-800">Chats</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <button
            onClick={() => { setActiveChat('global'); setShowSidebar(false); }}
            className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all ${activeChat === 'global' ? 'bg-indigo-100 text-indigo-800 font-bold shadow-sm' : 'hover:bg-slate-200/50 text-slate-700 font-medium'}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeChat === 'global' ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
              <WhatsAppIcon size={18} />
            </div>
            Global Chat
          </button>
          
          {(currentUser.role === 'Admin' || currentUser.role === 'Staff') && (
            <>
              <button
                onClick={() => { setActiveChat('group_students'); setShowSidebar(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all ${activeChat === 'group_students' ? 'bg-emerald-100 text-emerald-800 font-bold shadow-sm' : 'hover:bg-slate-200/50 text-slate-700 font-medium'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeChat === 'group_students' ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                  <GraduationCap size={18} />
                </div>
                All Students
              </button>
              <button
                onClick={() => { setActiveChat('group_staff'); setShowSidebar(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all ${activeChat === 'group_staff' ? 'bg-blue-100 text-blue-800 font-bold shadow-sm' : 'hover:bg-slate-200/50 text-slate-700 font-medium'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeChat === 'group_staff' ? 'bg-blue-200 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
                  <User size={18} />
                </div>
                All Staff
              </button>
            </>
          )}

          {/* Classes Section */}
          {classes.length > 0 && (
            <>
              <div className="pt-5 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Classes
              </div>
              {classes
                .filter(c => {
                  if (!c.id) return false;
                  if (currentUser.role === 'Admin' || currentUser.role === 'Staff') return true;
                  if (currentUser.role === 'Student') return c.name === currentUser.grade;
                  return false;
                })
                .map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setActiveChat(`class_${c.id}`); setShowSidebar(false); }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all ${activeChat === `class_${c.id}` ? 'bg-purple-100 text-purple-800 font-bold shadow-sm' : 'hover:bg-slate-200/50 text-slate-700 font-medium'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeChat === `class_${c.id}` ? 'bg-purple-200 text-purple-700' : 'bg-slate-200 text-slate-500'}`}>
                      <BookOpen size={18} />
                    </div>
                    <span className="truncate">{c.name}</span>
                  </button>
                ))
              }
            </>
          )}

          <div className="pt-5 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Direct Messages
          </div>
          {users.map(user => (
            <button
              key={user.id}
              onClick={() => { setActiveChat(user.id); setShowSidebar(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all ${activeChat === user.id ? 'bg-slate-200 text-slate-900 font-bold shadow-sm' : 'hover:bg-slate-200/50 text-slate-700 font-medium'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${activeChat === user.id ? 'bg-slate-800 text-white' : 'bg-slate-300 text-slate-700'}`}>
                {user.name.charAt(0)}
              </div>
              <span className="truncate flex-1">{user.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`${!showSidebar ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-slate-50/30`}>
        {/* Chat Header */}
        <div className="bg-white px-4 md:px-6 py-3 border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
              onClick={() => setShowSidebar(true)}
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-200/50">
              {activeChat === 'global' ? <WhatsAppIcon size={20} /> : 
               activeChat === 'group_students' ? <GraduationCap size={20} /> :
               activeChat === 'group_staff' ? <User size={20} /> :
               <User size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 leading-tight">
                {activeChat === 'global' ? 'Global Live Chat' : 
                 activeChat === 'group_students' ? 'Students Group' :
                 activeChat === 'group_staff' ? 'Staff Group' :
                 (activeChat && activeChat.startsWith('class_')) ? `${classes.find(c => `class_${c.id}` === activeChat)?.name || 'Class'} Group` :
                 users.find(u => u.id === activeChat)?.name || 'Chat'}
              </h2>
              <p className="text-xs font-medium text-emerald-600 flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Online
              </p>
            </div>
          </div>
          
          {onClose && (
            <button 
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg transition-colors border border-slate-200 hover:border-red-200"
            >
              <ArrowLeft size={16} />
              <span className="text-sm font-semibold">Back</span>
            </button>
          )}
        </div>

        {/* Messages Area */}
        <div 
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50"
        >
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <WhatsAppIcon size={40} className="opacity-40" />
              </div>
              <p className="font-medium">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            filteredMessages.map((msg, index) => {
              const isMe = msg.senderId === currentUser.id;
              const showHeader = index === 0 || filteredMessages[index - 1].senderId !== msg.senderId;
              const msgKey = `msg-${index}-${msg.id || msg.timestamp}`;

              return (
                <div key={msgKey} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {showHeader && (
                    <div className={`flex items-center gap-2 mb-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className="text-xs font-bold text-slate-700">{msg.senderName}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md border flex items-center gap-1 font-bold ${getRoleColor(msg.senderRole)}`}>
                        {getRoleIcon(msg.senderRole)}
                        {msg.senderRole}
                      </span>
                    </div>
                  )}
                  <div 
                    className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl relative group ${
                      isMe 
                        ? 'bg-indigo-600 text-white rounded-tr-sm shadow-sm' 
                        : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-sm'
                    }`}
                  >
                    {msg.image && (
                      <img src={msg.image} alt="Attachment" className="max-w-full rounded-xl mb-3 max-h-64 object-cover border border-black/10" />
                    )}
                    {msg.audio && (
                      <audio controls src={msg.audio} className="max-w-full mb-3 h-10 rounded-full" />
                    )}
                    {msg.zoomLink && (
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm">
                          <Video size={20} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-bold text-blue-900 mb-0.5">Zoom Meeting</p>
                          <a href={msg.zoomLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-700 hover:underline truncate block">
                            {msg.zoomLink}
                          </a>
                        </div>
                      </div>
                    )}
                    {msg.text && <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>}
                    <div className={`text-[10px] mt-2 flex items-center gap-1 font-medium ${isMe ? 'text-indigo-200 justify-end' : 'text-slate-400 justify-start'}`}>
                      <Clock size={10} />
                      {formatTime(msg.timestamp)}
                      {isMe && (
                        <span className="ml-1">
                          {(msg.readBy && msg.readBy.length > 1) ? (
                            <CheckCheck size={14} className="text-emerald-300" />
                          ) : (
                            <Check size={14} className="text-indigo-300" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white p-4 border-t border-slate-200 z-10">
          <form onSubmit={(e) => handleSend(e)} className="flex items-center gap-2 max-w-4xl mx-auto">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
              title="Attach Image"
            >
              <ImageIcon size={22} />
            </button>

            {(currentUser.role === 'Admin' || currentUser.role === 'Staff') && (
              <button
                type="button"
                onClick={handleZoomShare}
                className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="Share Zoom Link"
              >
                <Video size={22} />
              </button>
            )}

            {isRecording ? (
              <div className="flex-1 flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-full px-5 py-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></div>
                <span className="text-rose-600 font-mono text-sm font-bold">{formatRecordingTime(recordingTime)}</span>
                <span className="text-rose-600 text-sm font-medium flex-1">Recording...</span>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="p-1.5 bg-rose-100 text-rose-600 hover:bg-rose-200 rounded-full transition-colors"
                >
                  <Square size={16} className="fill-current" />
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={startRecording}
                  className="p-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                  title="Record Voice"
                >
                  <Mic size={22} />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full bg-slate-100 border-transparent focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-full px-5 py-3 text-sm transition-all"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={(!newMessage.trim() && !isRecording) || isRecording}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0 ${
                newMessage.trim() 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send size={20} className={newMessage.trim() ? "translate-x-0.5" : ""} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
