import React, { useState, useEffect } from "react";
import { getAnnouncements, saveAnnouncements, addNotification } from "../../lib/db";
import { Plus, Trash2, Bell, Megaphone, Eye, XCircle, Edit2 } from "lucide-react";

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    imageUrl: "",
    targetAudience: "All", // All, Students, Staff
    isActive: true,
  });

  useEffect(() => {
    getAnnouncements().then(setAnnouncements);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("Image size should be less than 5MB");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimensions
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.5 quality to ensure it fits in Firestore 1MB limit
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
          setFormData({ ...formData, imageUrl: compressedDataUrl });
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      alert("Please fill all fields");
      return;
    }

    let updated;
    if (editingId) {
      updated = announcements.map(a => 
        a.id === editingId ? { ...a, ...formData } : a
      );
      alert("Announcement updated successfully!");
    } else {
      const newEntry = {
        id: Date.now().toString(),
        ...formData,
        dateAdded: new Date().toISOString()
      };
      updated = [...announcements, newEntry];
      alert("Announcement added successfully!");
    }

    setAnnouncements(updated);
    await saveAnnouncements(updated);
    
    // Add Notification
    if (formData.isActive) {
      await addNotification({
        grade: formData.targetAudience === "Students" || formData.targetAudience === "All" ? "Public" : "Staff",
        title: formData.title,
        message: formData.message,
        type: 'announcement',
        createdAt: new Date().toISOString()
      });
    }
    
    setFormData({
      title: "",
      message: "",
      imageUrl: "",
      targetAudience: "All",
      isActive: true
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (ad: any) => {
    setFormData({
      title: ad.title,
      message: ad.message,
      imageUrl: ad.imageUrl || "",
      targetAudience: ad.targetAudience || "All",
      isActive: ad.isActive !== undefined ? ad.isActive : true
    });
    setEditingId(ad.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this announcement?")) {
      const updated = announcements.filter(a => a.id !== id);
      setAnnouncements(updated);
      await saveAnnouncements(updated);
    }
  };

  const toggleActive = async (id: string) => {
    const updated = announcements.map(a => 
      a.id === id ? { ...a, isActive: !a.isActive } : a
    );
    setAnnouncements(updated);
    await saveAnnouncements(updated);
  };

  return (
    <div className="min-h-screen bg-blue-50/40 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-3">
              <span className="bg-orange-400 text-white p-2 rounded-xl shadow-lg shadow-orange-200">
                <Megaphone size={28} />
              </span>
              Pop-up Announcements
            </h1>
            <p className="text-gray-500 font-medium mt-1 ml-1">Create pop-up ads and notifications for users.</p>
          </div>
          
          <button 
            onClick={() => {
              setIsAdding(!isAdding);
              if (isAdding) {
                setEditingId(null);
                setFormData({ title: "", message: "", imageUrl: "", targetAudience: "All", isActive: true });
              }
            }}
            className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-2"
          >
            {isAdding ? <XCircle size={20} /> : <Plus size={20} />}
            {isAdding ? "Cancel" : "Create Ad"}
          </button>
        </div>

        {isAdding && (
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-8 border-2 border-orange-100">
            <h3 className="text-xl font-bold text-orange-900 mb-6 flex items-center gap-2">
              <Bell className="text-orange-400" size={20} />
              {editingId ? "Edit Announcement" : "New Announcement"}
            </h3>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Title</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 focus:border-orange-400 focus:ring-0 bg-gray-50 font-medium"
                  placeholder="E.g., Special Holiday Class!"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Message</label>
                <textarea 
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                  className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 focus:border-orange-400 focus:ring-0 bg-gray-50 font-medium min-h-[100px]"
                  placeholder="Type your announcement message here..."
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Image Upload (PNG, JPG) - For Home Page Slideshow</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleImageUpload}
                    className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 focus:border-orange-400 focus:ring-0 bg-gray-50 font-medium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                  />
                  {formData.imageUrl && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-orange-200 flex-shrink-0">
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">Upload an image to display this announcement in the Home Page slideshow. Max size: 5MB.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Target Audience</label>
                <select 
                  value={formData.targetAudience}
                  onChange={e => setFormData({...formData, targetAudience: e.target.value})}
                  className="w-full border-2 border-gray-100 rounded-xl px-3 py-2.5 focus:border-orange-400 focus:ring-0 bg-gray-50 font-medium"
                >
                  <option value="All">All Users</option>
                  <option value="Students">Students Only</option>
                  <option value="Staff">Staff Only</option>
                </select>
              </div>

              <div className="flex items-end">
                <button type="submit" className="w-full bg-orange-600 text-white py-3 rounded-xl hover:bg-orange-700 font-bold shadow-md shadow-orange-200 transition-colors">
                  {editingId ? "Update Announcement" : "Publish Announcement"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {announcements.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()).map(ad => (
            <div key={ad.id} className={`bg-white rounded-3xl shadow-sm border-2 ${ad.isActive ? 'border-orange-200' : 'border-gray-200'} p-6 relative flex flex-col overflow-hidden`}>
              {ad.imageUrl && (
                <div className="w-full h-32 mb-4 rounded-xl overflow-hidden bg-gray-100">
                  <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg text-gray-800 pr-16">{ad.title}</h3>
                <div className="absolute top-4 right-4 flex gap-2">
                  <button 
                    onClick={() => handleEdit(ad)} 
                    className="text-gray-400 hover:text-blue-500 transition-colors bg-white/80 rounded-full p-1.5 backdrop-blur-sm shadow-sm"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(ad.id)} 
                    className="text-gray-400 hover:text-red-500 transition-colors bg-white/80 rounded-full p-1.5 backdrop-blur-sm shadow-sm"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mb-4 flex-1 whitespace-pre-wrap">{ad.message}</p>
              
              <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded-lg uppercase tracking-wider">
                  To: {ad.targetAudience}
                </span>
                
                <button 
                  onClick={() => toggleActive(ad.id)}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                    ad.isActive 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <Eye size={14} />
                  {ad.isActive ? 'Active' : 'Hidden'}
                </button>
              </div>
            </div>
          ))}
          
          {announcements.length === 0 && !isAdding && (
            <div className="col-span-full bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Megaphone size={40} className="text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-700">No Announcements Yet</h3>
              <p className="text-gray-500 mt-2">Create your first pop-up ad to notify students and staff.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
