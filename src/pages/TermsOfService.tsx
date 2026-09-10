import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ChevronLeft } from "lucide-react";
import { getAdminSettings } from "../lib/db";

export default function TermsOfService() {
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
          <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center">Terms of Service</h1>
          
          <div className="prose prose-lg max-w-none text-gray-600 space-y-6">
            <p className="text-sm text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
            
            <p>
              Welcome to <strong>{settings?.instituteName || "Agaram Dhines Academy"}</strong>. These Terms of Service ("Terms") govern your access to and use of our website, mobile application, and educational services. By accessing or using our platform, you agree to be bound by these Terms.
            </p>

            <h3 className="text-2xl font-bold text-gray-800 mt-8 mb-4">1. Acceptance of Terms</h3>
            <p>
              By accessing our platform, you agree to comply with and be bound by these Terms. If you do not agree with any part of these Terms, you may not access the service.
            </p>

            <h3 className="text-2xl font-bold text-gray-800 mt-8 mb-4">2. User Accounts</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must provide accurate and complete information when creating an account.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You must notify us immediately of any unauthorized use of your account.</li>
              <li>We reserve the right to suspend or terminate your account if any information provided proves to be inaccurate, false, or misleading.</li>
            </ul>

            <h3 className="text-2xl font-bold text-gray-800 mt-8 mb-4">3. Educational Content and Intellectual Property</h3>
            <p>
              All content provided on the platform, including but not limited to videos, study materials, quizzes, text, graphics, logos, and software, is the property of {settings?.instituteName || "Agaram Dhines Academy"} or its content suppliers and is protected by copyright and other intellectual property laws.
            </p>
            <p>
              You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or transmit any of the material on our platform without our prior written consent.
            </p>

            <h3 className="text-2xl font-bold text-gray-800 mt-8 mb-4">4. Payments and Refunds</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Fees for courses and services are clearly stated on our platform.</li>
              <li>Payments must be made in full before accessing paid content, unless otherwise specified.</li>
              <li>Refund policies are specific to each course and will be clearly communicated at the time of purchase. Generally, refunds are not provided once course access has been granted, except in exceptional circumstances determined at our sole discretion.</li>
            </ul>

            <h3 className="text-2xl font-bold text-gray-800 mt-8 mb-4">5. User Conduct</h3>
            <p>You agree not to use the platform to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate any applicable laws or regulations.</li>
              <li>Infringe upon the rights of others.</li>
              <li>Transmit any harmful, offensive, or disruptive content.</li>
              <li>Attempt to gain unauthorized access to our systems or user accounts.</li>
              <li>Share your account credentials with others.</li>
            </ul>

            <h3 className="text-2xl font-bold text-gray-800 mt-8 mb-4">6. Limitation of Liability</h3>
            <p>
              To the fullest extent permitted by law, {settings?.instituteName || "Agaram Dhines Academy"} shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the services.
            </p>

            <h3 className="text-2xl font-bold text-gray-800 mt-8 mb-4">7. Changes to Terms</h3>
            <p>
              We reserve the right to modify these Terms at any time. We will provide notice of significant changes by updating the date at the top of these Terms and maintaining a current version on our website.
            </p>

            <h3 className="text-2xl font-bold text-gray-800 mt-8 mb-4">Contact Us</h3>
            <p>
              If you have any questions about these Terms, please contact us at:
              <br />
              <strong>Email:</strong> support@agaramdhines.lk
              <br />
              <strong>Phone:</strong> +94 77 805 4232
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
