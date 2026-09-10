import React from 'react';
import { ExternalLink, ShieldAlert } from 'lucide-react';
import WhatsAppIcon from "../../components/WhatsAppIcon";

export default function WhatsApp() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-[#25D366] p-6 text-white flex items-center gap-4">
          <WhatsAppIcon size={40} />
          <div>
            <h1 className="text-2xl font-bold">WhatsApp Web Integration</h1>
            <p className="text-green-100">Connect your phone to send messages to students</p>
          </div>
        </div>
        
        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <WhatsAppIcon size={48} className="text-[#25D366]" />
          </div>
          
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            வாட்ஸ்அப் வெப் (WhatsApp Web)
          </h2>
          
          <p className="text-gray-600 mb-8 max-w-lg">
            பாதுகாப்பு காரணங்களுக்காக (Security Policies), வாட்ஸ்அப் நிறுவனம் தங்களது இணையதளத்தை வேறு எந்த செயலிக்குள்ளும் (App/Iframe) திறக்க அனுமதிப்பதில்லை. எனவே, கீழே உள்ள பட்டனை அழுத்தி புதிய Tab-ல் வாட்ஸ்அப் வெப்பைத் திறந்து உங்கள் மொபைலை இணைத்துக் கொள்ளவும்.
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 flex items-start gap-3 max-w-lg text-left">
            <ShieldAlert size={24} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-yellow-800 text-sm">முக்கிய குறிப்பு</h3>
              <p className="text-yellow-700 text-sm mt-1">
                புதிய Tab-ல் திறக்கும் WhatsApp Web-ல் உள்ள QR Code-ஐ உங்கள் மொபைலில் உள்ள WhatsApp-ல் ஸ்கேன் செய்து இணைக்கவும்.
              </p>
            </div>
          </div>
          
          <a 
            href="https://web.whatsapp.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 px-8 rounded-full flex items-center gap-2 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Open WhatsApp Web <ExternalLink size={20} />
          </a>
        </div>
      </div>
    </div>
  );
}
