import React from "react";
import LiveChat from "../../components/LiveChat";
import WhatsAppIcon from "../../components/WhatsAppIcon";

export default function AdminLiveChat() {
  const currentUser = {
    id: "admin-1",
    name: "Admin",
    role: "Admin"
  };

  return (
    <div className="p-6 h-[calc(100vh-64px)] flex flex-col">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <WhatsAppIcon className="text-indigo-600" />
          Live Chat
        </h1>
        <p className="text-gray-600">Communicate with students and staff in real-time.</p>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <LiveChat currentUser={currentUser} />
      </div>
    </div>
  );
}
