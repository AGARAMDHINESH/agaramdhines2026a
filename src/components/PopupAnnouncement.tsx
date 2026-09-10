import React, { useState, useEffect } from "react";
import { getAnnouncements } from "../lib/db";
import { X, Megaphone } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function PopupAnnouncement({ userRole }: { userRole: string }) {
  const [activeAd, setActiveAd] = useState<any | null>(null);

  useEffect(() => {
    const fetchAds = async () => {
      const ads = await getAnnouncements();
      
      // Filter active ads targeted to this user role or "All"
      const relevantAds = ads.filter(ad => 
        ad.isActive && 
        (ad.targetAudience === "All" || ad.targetAudience === userRole)
      );

      if (relevantAds.length > 0) {
        // Sort by newest first
        relevantAds.sort((a, b) => new Date(b.dateAdded || b.createdAt).getTime() - new Date(a.dateAdded || a.createdAt).getTime());
        
        // Find the first ad that hasn't been dismissed yet
        const dismissedAds = JSON.parse(localStorage.getItem("dismissedAds") || "[]");
        const nextAd = relevantAds.find(ad => {
          const adId = ad.id || `${ad.title}-${ad.dateAdded || ad.createdAt}`.replace(/\s+/g, '-');
          return !dismissedAds.includes(adId);
        });

        if (nextAd) {
          const adId = nextAd.id || `${nextAd.title}-${nextAd.dateAdded || nextAd.createdAt}`.replace(/\s+/g, '-');
          setActiveAd({ ...nextAd, id: adId });
        }
      }
    };

    fetchAds();
  }, [userRole]);

  const handleDismiss = () => {
    if (activeAd) {
      const dismissedAds = JSON.parse(localStorage.getItem("dismissedAds") || "[]");
      localStorage.setItem("dismissedAds", JSON.stringify([...dismissedAds, activeAd.id]));
      setActiveAd(null);
    }
  };

  return (
    <AnimatePresence>
      {activeAd && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="bg-white rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] max-w-md w-full overflow-hidden relative border border-white/20"
          >
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-purple-700 p-8 text-white flex items-center gap-5 relative overflow-hidden">
              {/* Decorative Background Elements */}
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              
              <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm relative z-10">
                <Megaphone size={36} className="text-white" />
              </div>
              <div className="relative z-10">
                <h2 className="text-2xl font-black tracking-tight leading-tight uppercase">அறிவிப்பு</h2>
                <p className="text-indigo-100 text-xs font-bold tracking-widest uppercase opacity-80">Announcement</p>
              </div>
              <button 
                onClick={handleDismiss}
                className="absolute top-6 right-6 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl p-2 transition-all hover:scale-110 active:scale-95"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
              {activeAd.imageUrl && (
                <div className="w-full h-auto max-h-64 mb-8 rounded-2xl overflow-hidden bg-gray-50 shadow-inner group">
                  <img 
                    src={activeAd.imageUrl} 
                    alt={activeAd.title} 
                    className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" 
                    referrerPolicy="no-referrer" 
                  />
                </div>
              )}
              <h3 className="text-2xl font-black text-slate-800 mb-4 leading-tight">{activeAd.title}</h3>
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-600 font-medium whitespace-pre-wrap leading-relaxed text-base italic-quotes">
                  {activeAd.message}
                </p>
              </div>
              
              <button 
                onClick={handleDismiss}
                className="mt-10 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl transition-all shadow-[0_20px_40px_-10px_rgba(79,70,229,0.3)] hover:shadow-[0_25px_50px_-12px_rgba(79,70,229,0.4)] active:scale-95 flex items-center justify-center gap-3 group"
              >
                <span>சரி, விளங்கியது</span>
                <span className="opacity-60 text-sm font-bold border-l border-white/30 pl-3">Got it!</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
