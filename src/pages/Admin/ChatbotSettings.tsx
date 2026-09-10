import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { getChatbotSettings, saveChatbotSettings } from '../../lib/db';

export default function ChatbotSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('grade06');

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
        
        if (activeTab && activeTab.startsWith('grade') && !migratedData.grades.find((g: any) => g.id === activeTab)) {
          if (migratedData.grades.length > 0) {
            setActiveTab(migratedData.grades[0].id);
          }
        }
      }
    });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveChatbotSettings(settings);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGradeTitleChange = (gradeId: string, value: string) => {
    setSettings((prev: any) => ({
      ...prev,
      grades: prev.grades.map((g: any) => 
        g.id === gradeId ? { ...g, title: value } : g
      )
    }));
  };

  const handleSubjectChange = (gradeId: string, index: number, field: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      grades: prev.grades.map((g: any) => {
        if (g.id === gradeId) {
          const newSubjects = [...(g.subjects || [])];
          newSubjects[index] = { ...newSubjects[index], [field]: value };
          return { ...g, subjects: newSubjects };
        }
        return g;
      })
    }));
  };

  const addSubject = (gradeId: string) => {
    setSettings((prev: any) => ({
      ...prev,
      grades: prev.grades.map((g: any) => {
        if (g.id === gradeId) {
          return {
            ...g,
            subjects: [
              ...(g.subjects || []),
              {
                id: Math.random().toString(36).substr(2, 9),
                name: 'New Subject',
                teacher: '',
                fee: '',
                duration: '',
                hasRecording: true,
                startDate: '',
                time: '',
                features: '',
                contact: '',
                whatsappLink: '',
                registrationLink: '',
                imageLink: ''
              }
            ]
          };
        }
        return g;
      })
    }));
  };

  const removeSubject = (gradeId: string, index: number) => {
    setSettings((prev: any) => ({
      ...prev,
      grades: prev.grades.map((g: any) => {
        if (g.id === gradeId) {
          const newSubjects = [...(g.subjects || [])];
          newSubjects.splice(index, 1);
          return { ...g, subjects: newSubjects };
        }
        return g;
      })
    }));
  };

  const addGrade = () => {
    const newGradeNum = (settings.grades.length + 1).toString().padStart(2, '0');
    const newGradeId = `grade${newGradeNum}_${Math.random().toString(36).substr(2, 5)}`;
    setSettings((prev: any) => ({
      ...prev,
      grades: [
        ...prev.grades,
        {
          id: newGradeId,
          title: `தரம் ${newGradeNum}`,
          subjects: []
        }
      ]
    }));
    setActiveTab(newGradeId);
  };

  const removeGrade = (gradeId: string) => {
    if (confirm('Are you sure you want to remove this grade?')) {
      setSettings((prev: any) => {
        const newGrades = prev.grades.filter((g: any) => g.id !== gradeId);
        if (activeTab === gradeId) {
          setActiveTab(newGrades.length > 0 ? newGrades[0].id : 'fees');
        }
        return { ...prev, grades: newGrades };
      });
    }
  };

  const handleFeeItemChange = (index: number, field: string, value: string) => {
    setSettings((prev: any) => {
      const newItems = [...(prev.fees?.items || [])];
      newItems[index] = { ...newItems[index], [field]: value };
      return {
        ...prev,
        fees: { ...prev.fees, items: newItems }
      };
    });
  };

  const addFeeItem = () => {
    setSettings((prev: any) => ({
      ...prev,
      fees: {
        ...prev.fees,
        items: [...(prev.fees?.items || []), { label: '', amount: '' }]
      }
    }));
  };

  const removeFeeItem = (index: number) => {
    setSettings((prev: any) => {
      const newItems = [...(prev.fees?.items || [])];
      newItems.splice(index, 1);
      return {
        ...prev,
        fees: { ...prev.fees, items: newItems }
      };
    });
  };

  if (!settings) {
    return <div className="p-6 text-center">Loading settings...</div>;
  }

  const tabs = [
    ...(settings.grades || []).map((g: any) => ({ id: g.id, label: g.title || 'Grade' })),
    { id: 'fees', label: 'Fees Info' },
    { id: 'contact', label: 'Contact Info' }
  ];

  const activeGrade = settings.grades?.find((g: any) => g.id === activeTab);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Chatbot Settings</h1>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={20} />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50 items-center pr-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={addGrade}
            className="ml-4 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
          >
            <Plus size={16} /> Add Grade
          </button>
        </div>

        <div className="p-6">
          {activeGrade && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex-1 mr-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade Title</label>
                  <input
                    type="text"
                    value={activeGrade.title}
                    onChange={(e) => handleGradeTitleChange(activeTab, e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => removeGrade(activeTab)}
                  className="mt-6 flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} /> Remove Grade
                </button>
              </div>

              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Subjects</h2>
                <button
                  onClick={() => addSubject(activeTab)}
                  className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 text-sm"
                >
                  <Plus size={16} /> Add Subject
                </button>
              </div>

              <div className="space-y-6">
                {(activeGrade.subjects || []).map((subject: any, index: number) => (
                  <div key={subject.id || index} className="bg-gray-50 p-4 rounded-xl border border-gray-200 relative">
                    <button
                      onClick={() => removeSubject(activeTab, index)}
                      className="absolute top-4 right-4 text-red-500 hover:text-red-700 p-1 bg-white rounded-md shadow-sm border border-gray-200"
                      title="Remove Subject"
                    >
                      <Trash2 size={16} />
                    </button>
                    
                    <h3 className="font-medium text-gray-800 mb-4">Subject {index + 1}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Subject Name</label>
                        <input
                          type="text"
                          value={subject.name}
                          onChange={(e) => handleSubjectChange(activeTab, index, 'name', e.target.value)}
                          className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Teacher</label>
                        <input
                          type="text"
                          value={subject.teacher}
                          onChange={(e) => handleSubjectChange(activeTab, index, 'teacher', e.target.value)}
                          className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Monthly Fee</label>
                        <input
                          type="text"
                          value={subject.fee}
                          onChange={(e) => handleSubjectChange(activeTab, index, 'fee', e.target.value)}
                          className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Class Time</label>
                        <input
                          type="text"
                          value={subject.time}
                          onChange={(e) => handleSubjectChange(activeTab, index, 'time', e.target.value)}
                          className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Class Duration</label>
                        <input
                          type="text"
                          value={subject.duration || ''}
                          onChange={(e) => handleSubjectChange(activeTab, index, 'duration', e.target.value)}
                          placeholder="e.g., 2 Hours"
                          className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex items-center mt-6">
                        <input
                          type="checkbox"
                          id={`recording-${index}`}
                          checked={subject.hasRecording !== false}
                          onChange={(e) => handleSubjectChange(activeTab, index, 'hasRecording', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`recording-${index}`} className="ml-2 block text-sm text-gray-900">
                          Class Recordings Available
                        </label>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Start Date & Description</label>
                        <textarea
                          value={subject.startDate}
                          onChange={(e) => handleSubjectChange(activeTab, index, 'startDate', e.target.value)}
                          rows={2}
                          className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Features / Speciality</label>
                        <input
                          type="text"
                          value={subject.features}
                          onChange={(e) => handleSubjectChange(activeTab, index, 'features', e.target.value)}
                          className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Contact Number</label>
                        <input
                          type="text"
                          value={subject.contact}
                          onChange={(e) => handleSubjectChange(activeTab, index, 'contact', e.target.value)}
                          className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">WhatsApp Group Link</label>
                        <input
                          type="text"
                          value={subject.whatsappLink}
                          onChange={(e) => handleSubjectChange(activeTab, index, 'whatsappLink', e.target.value)}
                          className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Registration Link (Optional)</label>
                        <input
                          type="text"
                          value={subject.registrationLink || ''}
                          onChange={(e) => handleSubjectChange(activeTab, index, 'registrationLink', e.target.value)}
                          placeholder="https://example.com/register"
                          className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Promo Image URL (Optional)</label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={subject.imageLink || ''}
                              onChange={(e) => handleSubjectChange(activeTab, index, 'imageLink', e.target.value)}
                              placeholder="https://example.com/image.jpg"
                              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        {subject.imageLink && (
                          <div className="mt-2 border rounded-lg p-2 bg-white inline-block">
                            <img src={subject.imageLink} alt="Preview" className="h-24 object-contain" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {(!activeGrade.subjects || activeGrade.subjects.length === 0) && (
                  <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    No subjects added yet. Click "Add Subject" to create one.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'fees' && settings.fees && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note Title</label>
                <input
                  type="text"
                  value={settings.fees.noteTitle || ''}
                  onChange={(e) => setSettings({ ...settings, fees: { ...settings.fees, noteTitle: e.target.value } })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note Description</label>
                <textarea
                  value={settings.fees.noteDescription || ''}
                  onChange={(e) => setSettings({ ...settings, fees: { ...settings.fees, noteDescription: e.target.value } })}
                  rows={2}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Footer Note</label>
                <input
                  type="text"
                  value={settings.fees.noteFooter || ''}
                  onChange={(e) => setSettings({ ...settings, fees: { ...settings.fees, noteFooter: e.target.value } })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Fee Items</label>
                  <button onClick={addFeeItem} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <Plus size={16} /> Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {(settings.fees.items || []).map((item: any, index: number) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => handleFeeItemChange(index, 'label', e.target.value)}
                        placeholder="Label (e.g., Grade 06 - 09)"
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        value={item.amount}
                        onChange={(e) => handleFeeItemChange(index, 'amount', e.target.value)}
                        placeholder="Amount (e.g., Rs. 1300)"
                        className="w-32 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button onClick={() => removeFeeItem(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Payment Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={settings.payment?.bank || ''}
                      onChange={(e) => setSettings({ ...settings, payment: { ...settings.payment, bank: e.target.value } })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                    <input
                      type="text"
                      value={settings.payment?.name || ''}
                      onChange={(e) => setSettings({ ...settings, payment: { ...settings.payment, name: e.target.value } })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={settings.payment?.accountNo || ''}
                      onChange={(e) => setSettings({ ...settings, payment: { ...settings.payment, accountNo: e.target.value } })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                    <input
                      type="text"
                      value={settings.payment?.branch || ''}
                      onChange={(e) => setSettings({ ...settings, payment: { ...settings.payment, branch: e.target.value } })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contact' && settings.contact && (
            <div className="space-y-6 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <input
                  type="text"
                  value={settings.contact.message || ''}
                  onChange={(e) => setSettings({ ...settings, contact: { ...settings.contact, message: e.target.value } })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                <input
                  type="text"
                  value={settings.contact.whatsapp || ''}
                  onChange={(e) => setSettings({ ...settings, contact: { ...settings.contact, whatsapp: e.target.value } })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={settings.contact.phone || ''}
                  onChange={(e) => setSettings({ ...settings, contact: { ...settings.contact, phone: e.target.value } })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website Link</label>
                <input
                  type="text"
                  value={settings.contact?.website || ''}
                  onChange={(e) => setSettings({ ...settings, contact: { ...settings.contact, website: e.target.value } })}
                  placeholder="https://example.com"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">General WhatsApp Group Link</label>
                <input
                  type="text"
                  value={settings.contact?.whatsappGroup || ''}
                  onChange={(e) => setSettings({ ...settings, contact: { ...settings.contact, whatsappGroup: e.target.value } })}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
