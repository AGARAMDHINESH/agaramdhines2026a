import React, { useState, useEffect } from 'react';
import { getZoomLinks, saveZoomLinks, getSubjects, getClasses, addNotification } from '../../lib/db';
import { Video, PlayCircle, Trash2, ArrowLeft, Plus, ExternalLink, BookOpen, Calendar, Clock, Key } from 'lucide-react';
import CountdownTimer from '../../components/CountdownTimer';

export default function LiveClasses() {
  const [links, setLinks] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    subject: '',
    title: '',
    link: '',
    datetime: '',
    hostKey: '',
    meetingId: '',
    passcode: ''
  });

  useEffect(() => {
    getZoomLinks().then(data => {
      if (Array.isArray(data)) {
        setLinks(data);
      } else {
        setLinks([]);
      }
    });
    getSubjects().then(data => setSubjects(data || []));
    getClasses().then(data => setClasses(data || []));
  }, []);

  const GRADES = [
    "தரம் 01", "தரம் 02", "தரம் 03", "தரம் 04", "தரம் 05", 
    "தரம் 06", "தரம் 07", "தரம் 08", "தரம் 09", "தரம் 10", 
    "தரம் 11", "தரம் 12", "தரம் 13"
  ];

  const grades = GRADES;

  const availableSubjectsForGrade = selectedGrade 
    ? classes.find(c => c.name === selectedGrade)?.subjects || []
    : [];

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.title || !formData.link || !formData.datetime) {
      alert("Subject, Title, Link, and Date/Time are required!");
      return;
    }

    setIsSaving(true);
    try {
      const newLink = { 
        id: "zoom_" + Date.now().toString(), 
        grade: selectedGrade,
        subject: formData.subject,
        title: formData.title,
        link: formData.link.trim(),
        datetime: formData.datetime,
        hostKey: formData.hostKey.trim(),
        meetingId: formData.meetingId.trim(),
        passcode: formData.passcode.trim(),
        dateAdded: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const currentLinks = await getZoomLinks();
      const updatedLinks = [newLink, ...currentLinks.filter(l => l.id !== newLink.id)];
      setLinks(updatedLinks);
      await saveZoomLinks(updatedLinks);
      
      // Add Notification for Students
      if (selectedGrade) {
        await addNotification({
          grade: selectedGrade,
          title: "புதிய Zoom வகுப்பு!",
          message: `${formData.subject}: ${formData.title} வகுப்பு நேரலைக்காக சேர்க்கப்பட்டுள்ளது.`,
          type: 'zoom_class',
          createdAt: new Date().toISOString()
        });
      }
      
      setFormData({ subject: '', title: '', link: '', datetime: '', hostKey: '', meetingId: '', passcode: '' });
      setSaveSuccessMsg("Zoom இணைப்பு டேட்டாபேஸ் மற்றும் கணினியில் வெற்றிகரமாக சேமிக்கப்பட்டது!");
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err: any) {
      alert("Zoom இணைப்பை சேமிப்பதில் பிழை: " + err?.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this Zoom link?")) {
      const updatedLinks = links.filter(l => l.id !== id);
      setLinks(updatedLinks);
      await saveZoomLinks(updatedLinks);
    }
  };

  const formatDateTime = (datetimeStr: string) => {
    if (!datetimeStr) return "Not set";
    const date = new Date(datetimeStr);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  if (selectedGrade) {
    // Sort links by datetime (newest first or upcoming first? Let's sort by datetime ascending so upcoming is first)
    const gradeLinks = links
      .filter(l => l && l.grade === selectedGrade)
      .sort((a, b) => {
        const timeA = a.datetime ? new Date(a.datetime).getTime() : 0;
        const timeB = b.datetime ? new Date(b.datetime).getTime() : 0;
        return timeA - timeB;
      });
    
    return (
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedGrade(null)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{selectedGrade} - Live Classes</h2>
              <p className="text-sm text-gray-500">Manage Zoom links for this class</p>
            </div>
          </div>
          <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-medium flex items-center gap-2">
            <Video size={20} />
            {gradeLinks.length} Classes
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Plus size={20} className="text-blue-600" />
                Schedule Live Class
              </h3>
              <form onSubmit={handleAddLink} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select 
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-white"
                  >
                    <option value="">Select Subject</option>
                    {availableSubjectsForGrade.map((s: string) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {availableSubjectsForGrade.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">No subjects assigned to this class. Please go to Classes to assign subjects.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topic / Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Algebra Chapter 1" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zoom URL</label>
                  <input 
                    type="url" 
                    placeholder="https://zoom.us/j/..." 
                    value={formData.link}
                    onChange={(e) => setFormData({...formData, link: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meeting ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g., 123 456 7890" 
                      value={formData.meetingId}
                      onChange={(e) => setFormData({...formData, meetingId: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Passcode</label>
                    <input 
                      type="text" 
                      placeholder="e.g., 123456" 
                      value={formData.passcode}
                      onChange={(e) => setFormData({...formData, passcode: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Host Key (Admin/Staff Only)</label>
                  <input 
                    type="text" 
                    placeholder="e.g., 123456" 
                    value={formData.hostKey}
                    onChange={(e) => setFormData({...formData, hostKey: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={formData.datetime}
                    onChange={(e) => setFormData({...formData, datetime: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" 
                  />
                </div>
                {saveSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm flex items-center gap-2">
                    <span>✓</span>
                    <span>{saveSuccessMsg}</span>
                  </div>
                )}
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Video size={18} />
                  {isSaving ? "டேட்டாபேஸில் சேமிக்கப்படுகிறது (Saving to DB)..." : "Save Zoom Link (சேமிக்கவும்)"}
                </button>
              </form>
            </div>
          </div>

          {/* Classes List */}
          <div className="lg:col-span-2 space-y-4">
            {gradeLinks.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <Video size={32} className="text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No live classes scheduled</h3>
                <p className="text-gray-500">Schedule your first Zoom class for {selectedGrade} using the form.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gradeLinks.map((link) => {
                  return (
                    <div key={link.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow">
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <div className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <BookOpen size={12} />
                            {link.subject}
                          </div>
                          <button 
                            onClick={() => handleDelete(link.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors p-1.5 hover:bg-red-50 rounded-md"
                            title="Delete Class"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        
                        <h4 className="font-bold text-gray-900 text-lg mb-4 line-clamp-2" title={link.title}>{link.title}</h4>
                        
                        <div className="space-y-2 mb-5">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar size={16} className="text-gray-400" />
                            <span>{formatDateTime(link.datetime)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <CountdownTimer targetDate={link.datetime} />
                          </div>
                          {link.meetingId && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Video size={16} className="text-gray-400" />
                              <span>Meeting ID: <span className="font-mono bg-gray-100 px-1 rounded">{link.meetingId}</span></span>
                            </div>
                          )}
                          {link.passcode && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Key size={16} className="text-gray-400" />
                              <span>Passcode: <span className="font-mono bg-gray-100 px-1 rounded">{link.passcode}</span></span>
                            </div>
                          )}
                          {link.hostKey && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Key size={16} className="text-gray-400" />
                              <span>Host Key: <span className="font-mono bg-gray-100 px-1 rounded">{link.hostKey}</span></span>
                            </div>
                          )}
                        </div>
                        
                        <a 
                          href={link.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          Join Meeting <ExternalLink size={16} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      {/* Live Classes Banner */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg bg-gradient-to-r from-blue-700 to-blue-900 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=2000')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl border-4 border-white/20 shrink-0">
              <Video size={48} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Live Classes</h1>
              <p className="text-blue-100 text-lg mb-4">Manage Zoom Meetings & Virtual Classrooms</p>
              <div className="flex items-center gap-4 text-sm font-medium">
                <span className="bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm">Interactive Learning</span>
                <span className="bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm">All Grades</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grades Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Manage by Class</h2>
          <p className="text-gray-500">Select a grade to schedule or manage Zoom links</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {grades.map((grade) => {
            const classCount = links.filter(l => l && l.grade === grade).length;
            
            return (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group text-left relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                
                <div className="flex justify-between items-start mb-4 relative">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Video size={24} />
                  </div>
                  {classCount > 0 && (
                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
                      {classCount}
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-gray-800 mb-1 relative">{grade}</h3>
                <p className="text-sm text-gray-500 relative">
                  {classCount === 0 ? 'No classes' : `${classCount} class${classCount > 1 ? 'es' : ''}`}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
