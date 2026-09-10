import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ChevronLeft } from "lucide-react";
import { getAdminSettings } from "../lib/db";

export default function OurStory() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    getAdminSettings().then(data => {
      if (data) setSettings(data);
    });
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/90 backdrop-blur-md shadow-sm z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            {settings?.profileImage ? (
              <img src={settings.profileImage} alt="Logo" className="w-10 h-10 object-cover rounded-xl shadow-lg" />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg transform -rotate-3 transition-transform hover:rotate-0">
                <BookOpen className="text-white" size={24} />
              </div>
            )}
            <span className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-800 to-indigo-800 tracking-tight">
              {settings?.instituteName || "Agaram Dhines Academy"}
            </span>
          </div>
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-semibold transition-colors"
          >
            <ChevronLeft size={20} /> Back to Home
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-gray-100">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center">Our Story</h1>
          
          <div className="prose prose-lg max-w-none text-gray-600 space-y-6">
            <p>
              Welcome to <strong>{settings?.instituteName || "Agaram Dhines Academy"}</strong>. Our journey began with a simple yet powerful vision: to make quality education accessible to every student, regardless of their geographical location.
            </p>
            
            <p>
              Founded with a passion for teaching and a commitment to excellence, we have grown from a small local tuition center into a comprehensive online learning platform. We specialize in providing top-tier education in both Tamil and English mediums, ensuring that language is never a barrier to learning.
            </p>

            <h3 className="text-2xl font-bold text-gray-800 mt-8 mb-4">Our Mission</h3>
            <p>
              Our mission is to empower students with the knowledge, skills, and confidence they need to succeed in their academic pursuits and beyond. We strive to create an engaging, interactive, and supportive online environment where every student can thrive.
            </p>

            <h3 className="text-2xl font-bold text-gray-800 mt-8 mb-4">Why Choose Us?</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Expert Faculty:</strong> Learn from experienced and dedicated educators who are passionate about their subjects.</li>
              <li><strong>Bilingual Instruction:</strong> Classes available in both Tamil and English mediums to cater to diverse student needs.</li>
              <li><strong>Interactive Learning:</strong> Engaging live sessions, comprehensive study materials, and regular assessments.</li>
              <li><strong>Flexible Access:</strong> Learn from the comfort of your home with our user-friendly online platform.</li>
            </ul>

            <p className="mt-8 font-medium text-gray-800">
              Join us at {settings?.instituteName || "Agaram Dhines Academy"} and take the first step towards a brighter future!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
