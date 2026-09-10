import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ChevronLeft, Briefcase } from "lucide-react";
import { getAdminSettings } from "../lib/db";

export default function Careers() {
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
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Briefcase size={40} className="text-blue-600" />
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 text-center">Careers at {settings?.instituteName || "Agaram Dhines Academy"}</h1>
            <p className="text-lg text-gray-500 mt-4 text-center max-w-2xl">
              Join our team of passionate educators and professionals dedicated to transforming online education.
            </p>
          </div>
          
          <div className="prose prose-lg max-w-none text-gray-600 space-y-6">
            <h3 className="text-2xl font-bold text-gray-800 mt-8 mb-4">Why Work With Us?</h3>
            <p>
              At {settings?.instituteName || "Agaram Dhines Academy"}, we believe that our strength lies in our people. We are always looking for talented, driven, and innovative individuals who share our vision of making quality education accessible to all.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Impactful Work:</strong> Shape the future of thousands of students across the country.</li>
              <li><strong>Collaborative Environment:</strong> Work alongside experienced educators and tech enthusiasts.</li>
              <li><strong>Growth Opportunities:</strong> Continuous learning and professional development.</li>
              <li><strong>Flexible Culture:</strong> We value work-life balance and offer flexible working arrangements.</li>
            </ul>

            <h3 className="text-2xl font-bold text-gray-800 mt-12 mb-6 border-b pb-2">Current Openings</h3>
            
            <div className="space-y-6">
              {/* Job 1 */}
              <div className="border border-gray-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-xl font-bold text-gray-900">Online Tutor (Tamil Medium)</h4>
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">Full-time / Part-time</span>
                </div>
                <p className="text-gray-600 mb-4">We are looking for experienced teachers to conduct online classes for O/L and A/L students in Tamil medium.</p>
                <div className="flex gap-4 text-sm text-gray-500 font-medium">
                  <span>📍 Remote</span>
                  <span>🎓 Min. 2 years experience</span>
                </div>
              </div>

              {/* Job 2 */}
              <div className="border border-gray-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-xl font-bold text-gray-900">Online Tutor (English Medium)</h4>
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">Full-time / Part-time</span>
                </div>
                <p className="text-gray-600 mb-4">Seeking passionate educators for English medium classes across various subjects.</p>
                <div className="flex gap-4 text-sm text-gray-500 font-medium">
                  <span>📍 Remote</span>
                  <span>🎓 Min. 2 years experience</span>
                </div>
              </div>

              {/* Job 3 */}
              <div className="border border-gray-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-xl font-bold text-gray-900">Student Support Executive</h4>
                  <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">Full-time</span>
                </div>
                <p className="text-gray-600 mb-4">Help students navigate our platform, resolve queries, and ensure a smooth learning experience.</p>
                <div className="flex gap-4 text-sm text-gray-500 font-medium">
                  <span>📍 Remote / Office</span>
                  <span>🗣️ Fluent in Tamil & English</span>
                </div>
              </div>
            </div>

            <div className="mt-12 bg-blue-50 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold text-blue-900 mb-4">Don't see a perfect fit?</h3>
              <p className="text-blue-800 mb-6">
                We are always open to connecting with great talent. Send us your resume and let us know how you can contribute to our mission.
              </p>
              <a href="mailto:careers@agaramdhines.lk" className="inline-block bg-blue-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                Email Your Resume
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
