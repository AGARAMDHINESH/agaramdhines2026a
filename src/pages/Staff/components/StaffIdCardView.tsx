import React, { useRef } from "react";
import { CreditCard, Download, Printer, QrCode, ShieldCheck, Sparkles } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

interface StaffIdCardViewProps {
  staff: any;
  adminSettings?: any;
}

export default function StaffIdCardView({ staff, adminSettings }: StaffIdCardViewProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownload = async (format: "png" | "pdf") => {
    if (!cardRef.current) return;
    try {
      const imgData = await toPng(cardRef.current, { pixelRatio: 3, backgroundColor: "#ffffff" });

      if (format === "png") {
        const link = document.createElement("a");
        link.download = `${staff.name.replace(/\s+/g, "_")}_ID_Card.png`;
        link.href = imgData;
        link.click();
      } else {
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "in",
          format: [3.375, 2.125]
        });
        pdf.addImage(imgData, "PNG", 0, 0, 3.375, 2.125);
        pdf.save(`${staff.name.replace(/\s+/g, "_")}_ID_Card.pdf`);
      }
    } catch (err) {
      console.error("Failed to generate ID card:", err);
      alert("Failed to download ID card. Please try again.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-2 border border-blue-400/30">
            <CreditCard size={14} /> Official Identity Document
          </div>
          <h1 className="text-2xl font-black">Staff Identity Card</h1>
          <p className="text-blue-200 text-xs mt-0.5">Official employee identity badge for {staff.name}</p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => handleDownload("png")}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
          >
            <Download size={14} /> Download PNG
          </button>
          <button
            onClick={() => handleDownload("pdf")}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
          >
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>

      {/* ID Card Display Frame */}
      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center">
        {/* Card Component */}
        <div
          ref={cardRef}
          className="w-[340px] sm:w-[380px] bg-white rounded-2xl border-2 border-blue-800 shadow-xl overflow-hidden text-gray-800 relative select-none"
        >
          {/* Header Strip */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 p-4 text-center text-white relative">
            <div className="flex items-center justify-center gap-2 mb-1">
              {adminSettings?.profileImage ? (
                <img src={adminSettings.profileImage} alt="Logo" className="w-7 h-7 object-cover rounded-md" />
              ) : (
                <div className="w-7 h-7 bg-blue-500 rounded-md flex items-center justify-center text-white font-black text-xs">
                  A
                </div>
              )}
              <h2 className="font-black text-base tracking-wider uppercase">
                {adminSettings?.instituteName || "AGARAM DHINES ACADEMY"}
              </h2>
            </div>
            <p className="text-[10px] text-blue-200 font-semibold tracking-widest uppercase">
              Official Staff Identification
            </p>
          </div>

          {/* Body */}
          <div className="p-5 flex flex-col items-center">
            {/* Photo */}
            <div className="w-24 h-24 rounded-2xl border-3 border-blue-600 shadow-md overflow-hidden bg-gray-100 mb-3 flex items-center justify-center">
              {staff.image ? (
                <img src={staff.image} alt={staff.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-blue-800">{staff.name.charAt(0)}</span>
              )}
            </div>

            {/* Name & Role */}
            <h3 className="text-lg font-black text-gray-900 text-center tracking-tight">{staff.name}</h3>
            <div className="mt-1 px-3 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wide">
              {staff.role || "Design Worker"}
            </div>

            {staff.specialization && (
              <p className="text-[11px] text-gray-600 font-medium mt-1 text-center italic">
                {staff.specialization}
              </p>
            )}

            {/* Details Table */}
            <div className="w-full bg-gray-50 border border-gray-200/80 rounded-xl p-3 mt-4 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Staff ID:</span>
                <span className="font-mono font-bold text-gray-900">{staff.id || "AG-STF-01"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Phone:</span>
                <span className="font-bold text-gray-900">{staff.phone || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Joined:</span>
                <span className="font-bold text-gray-900">{staff.joinDate || "N/A"}</span>
              </div>
            </div>

            {/* QR Code */}
            <div className="mt-4 flex items-center justify-center p-2 bg-white rounded-xl border border-gray-200 shadow-inner">
              <QRCodeSVG value={`AGARAM-STAFF-${staff.id || staff.name}`} size={64} level="M" />
            </div>
            <p className="text-[9px] text-gray-400 mt-2">Scan for instant digital verification</p>
          </div>

          {/* Footer Strip */}
          <div className="bg-blue-950 text-blue-300 text-[9px] py-1.5 px-4 text-center font-medium">
            Agaram Academy • Authorized Employee Card
          </div>
        </div>
      </div>
    </div>
  );
}
