import React, { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { Copy, Download, Printer, Check } from "lucide-react";
import { ParcelDelivery } from "../lib/db";

interface ParcelReceiptCardProps {
  parcel: ParcelDelivery;
  showActions?: boolean;
  className?: string;
  isPrintView?: boolean;
}

export default function ParcelReceiptCard({
  parcel,
  showActions = true,
  className = "",
  isPrintView = false
}: ParcelReceiptCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Short, fast, ultra-clean confirmation link that creates big chunky scannable QR modules
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const cleanId = (parcel.trackingNumber || parcel.id || parcel.studentRollNo || "PARCEL").trim();
  const confirmationUrl = `${origin}/parcel-confirm/${encodeURIComponent(cleanId)}`;

  // Copy card image to clipboard
  const handleCopyImage = async () => {
    if (!cardRef.current) return;
    try {
      setCopied(true);
      const dataUrl = await toPng(cardRef.current, { quality: 0.98, pixelRatio: 2.5 });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      if (navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({ "image/png": blob })
        ]);
        alert("ரசீது படம் நகலெடுக்கப்பட்டது! (Receipt image copied to clipboard)");
      } else {
        const link = document.createElement("a");
        link.download = `Parcel_${parcel.studentRollNo || parcel.trackingNumber}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err: any) {
      console.error("Copy image error:", err);
      alert("படம் காப்பி செய்வதில் பிழை: " + (err?.message || err));
    } finally {
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Download card as PNG
  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    try {
      setDownloading(true);
      const dataUrl = await toPng(cardRef.current, { quality: 1, pixelRatio: 3 });
      const link = document.createElement("a");
      link.download = `Agaram_Parcel_${parcel.studentRollNo || parcel.trackingNumber}_${parcel.studentName.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      console.error("Download image error:", err);
      alert("பதிவிறக்கத்தில் பிழை: " + (err?.message || err));
    } finally {
      setDownloading(false);
    }
  };

  // Download Single Receipt as A6 PDF
  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;
    try {
      setDownloading(true);
      const dataUrl = await toPng(cardRef.current, { quality: 1, pixelRatio: 3 });
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [105, 148.5]
      });

      pdf.addImage(dataUrl, "PNG", 3, 3, 99, 142);
      pdf.save(`Agaram_Parcel_${parcel.studentRollNo || parcel.trackingNumber}.pdf`);
    } catch (err: any) {
      console.error("PDF generation error:", err);
      alert("PDF உருவாக்குவதில் பிழை: " + (err?.message || err));
    } finally {
      setDownloading(false);
    }
  };

  // Print single receipt
  const handlePrint = () => {
    if (!cardRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Parcel Receipt - ${parcel.studentRollNo}</title>
          <style>
            @page {
              size: 105mm 148.5mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 3mm;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background: #fff;
            }
            .print-wrapper {
              width: 99mm;
              max-width: 99mm;
            }
          </style>
        </head>
        <body>
          <div class="print-wrapper">
            ${cardRef.current.outerHTML}
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 350);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Compute all recipient address lines dynamically
  const addressLines = (parcel.addressLines && parcel.addressLines.length > 0)
    ? parcel.addressLines.map(l => String(l || '').trim()).filter(Boolean)
    : [parcel.addressLine1, parcel.addressLine2, parcel.addressLine3, parcel.addressLine4].map(l => String(l || '').trim()).filter(Boolean);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* 
        The Physical Receipt Card
        Layout Ordering (User Specified):
        1. Top Header (Logo + 2-line title + Tel)
        2. 'To,-' Box (Recipient Details - TOP)
        3. Center Row: Chunky Scannable QR Code + Square Official Seal (சதுர முத்திரை)
        4. Roll Number Box + 1D Barcode
        5. 'From,-' Box (Sender Details - BOTTOM)
      */}
      <div
        ref={cardRef}
        className={`bg-white text-black border-2 border-black rounded-lg shadow-sm font-sans flex flex-col justify-between select-none relative box-border overflow-hidden ${
          isPrintView 
            ? "w-[98mm] max-w-[98mm] h-[141mm] max-h-[141mm] p-2" 
            : "w-[340px] sm:w-[350px] max-w-[360px] p-2.5"
        }`}
        style={isPrintView ? { width: "98mm", maxWidth: "98mm", height: "141mm", maxHeight: "141mm", boxSizing: "border-box" } : { maxWidth: "360px" }}
      >
        {/* 1. TOP HEADER: Centered Academy Title + Online Academy + Tel + Double Line */}
        <div className="relative pb-1 shrink-0 text-center">
          <div className="absolute left-0.5 top-0 w-8 h-8 rounded-full border border-black overflow-hidden bg-white flex items-center justify-center p-0.5 shadow-2xs">
            <img 
              src="/logo.png" 
              alt="Logo" 
              crossOrigin="anonymous" 
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/apple-touch-icon.png";
              }}
            />
          </div>

          <div className="text-[13.5px] sm:text-[14px] font-black tracking-wider uppercase font-serif text-black leading-tight text-center">
            AGARAM DHINESH
          </div>
          <div className="text-[12.5px] sm:text-[13px] font-black tracking-wider uppercase font-serif text-black leading-tight text-center mt-0.5">
            ONLINE ACADEMY
          </div>
          <p className="text-[10px] font-extrabold tracking-wide text-black leading-none mt-1 text-center">
            Tel - {parcel.senderPhone || "0778054232"}
          </p>

          {/* Two lines below header as requested: "அதுக்கு கீழ ரெண்டு கோடுகள் கொடு" */}
          <div className="w-full mt-1.5 space-y-[2px]">
            <div className="border-b-[1.5px] border-black w-full"></div>
            <div className="border-b-[1.5px] border-black w-full"></div>
          </div>
        </div>

        {/* 2. 'To,-' BOX (பெறுநர் மாணவர் விபரங்கள் - மேலே / TOP) */}
        <div className="mt-1 border-2 border-black p-1.5 rounded bg-white">
          <div className="text-[9.5px] font-black uppercase tracking-wider mb-0.5 leading-none text-black">
            To,-
          </div>
          <div className="space-y-0.5 text-[10.5px] leading-tight">
            <div className="flex items-start">
              <span className="font-bold min-w-[50px] text-[10px] text-black">Name-</span>
              <span className="font-extrabold uppercase text-[11px] break-words flex-1 text-black">
                {parcel.studentName}
              </span>
            </div>
            <div className="flex items-start">
              <span className="font-bold min-w-[50px] text-[10px] text-black">Address-</span>
              <div className="flex-1 font-semibold text-[10px] leading-tight text-gray-900">
                {addressLines.length > 0 ? (
                  addressLines.map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))
                ) : (
                  <div>{parcel.addressLine1 || "Address Line 1"}</div>
                )}
              </div>
            </div>
            <div className="flex items-center pt-0.5">
              <span className="font-bold min-w-[50px] text-[10px] text-black">Tel-</span>
              <span className="font-bold text-[10.5px] tracking-wider text-black">
                {parcel.phone || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* 3. CENTER ROW: Highly Scannable Chunky QR Code + Square Official Seal Box */}
        <div className={`my-1 flex items-center justify-between ${isPrintView ? "gap-2 px-0.5" : "gap-3 px-1"}`}>
          {/* QR Code Section (Enlarged for Instant Camera Scannability) */}
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="p-1 border-2 border-black rounded-lg bg-white shadow-2xs">
              <QRCodeSVG
                value={confirmationUrl}
                size={isPrintView ? 80 : 98}
                level="M"
                includeMargin={true}
              />
            </div>
            <span className="text-[8.5px] font-black text-black uppercase tracking-wider mt-0.5 leading-none">
              DELIVERY QR CODE
            </span>
            <span className="text-[6.5px] font-bold text-gray-800 leading-tight mt-0.5 max-w-[150px]">
              பார்சல் கிடைத்தவுடன் மேலே உள்ள QR Code-ஐ ஸ்கேன் செய்யவும்
            </span>
          </div>

          {/* Square Official Seal Box (Official Seal - Agaram Dhinesh) */}
          <div className={`${isPrintView ? "w-[84px] h-[84px]" : "w-[98px] h-[98px]"} border-2 border-black rounded-lg flex flex-col items-center justify-between p-1.5 text-center bg-white shadow-2xs shrink-0`}>
            <div className="w-full text-center border-b border-black pb-0.5">
              <span className="text-[8.5px] font-black tracking-wider uppercase text-black block leading-none">
                OFFICIAL SEAL
              </span>
              <span className="text-[7px] font-extrabold text-black block leading-tight mt-0.5">
                உத்தியோகபூர்வ முத்திரை
              </span>
            </div>

            {/* Clean empty stamping area for physical rubber seal */}
            <div className="flex-1 w-full" />

            <div className="w-full pt-1 border-t border-black text-[9.5px] font-black uppercase text-black tracking-wider leading-none text-center font-serif">
              AGARAM DHINESH
            </div>
          </div>
        </div>

        {/* 4. ROLL NUMBER & AGD TRACKING BOX (NO COLONS) */}
        <div className="border-2 border-black py-1 px-2.5 rounded text-center bg-white mb-1.5">
          <div className="text-[11px] font-black tracking-wider uppercase leading-tight text-black flex items-center justify-center gap-2.5 flex-wrap">
            <span>Roll Number</span>
            <span className="font-mono text-[12.5px] underline decoration-2 font-black text-black">
              {parcel.studentRollNo || parcel.rollNo || "—"}
            </span>
            {parcel.trackingNumber && (
              <span className="font-mono text-[11px] font-black text-black bg-gray-100 px-2 py-0.5 rounded border border-black">
                {parcel.trackingNumber}
              </span>
            )}
          </div>
        </div>

        {/* 5. 'From,-' BOX (அனுப்புநர் ஆசிரியர் விபரங்கள் - கீழே / BOTTOM) */}
        <div className="border-2 border-black p-1.5 rounded bg-white">
          <div className="text-[9.5px] font-black uppercase tracking-wider mb-0.5 leading-none text-black">
            From,-
          </div>
          <div className="text-[10px] space-y-0.5 leading-tight">
            <div className="font-extrabold text-[11px] text-black">
              {parcel.senderName && !/[\u0B80-\u0BFF]/.test(parcel.senderName) ? parcel.senderName : "D. Dineshkumar"}
            </div>
            <div className="font-semibold text-[9.5px] leading-tight text-gray-900">
              {parcel.senderAddressLine1 && !/[\u0B80-\u0BFF]/.test(parcel.senderAddressLine1) ? parcel.senderAddressLine1 : "No. 111/2, Pahalagamma,"}<br />
              {parcel.senderAddressLine2 && !/[\u0B80-\u0BFF]/.test(parcel.senderAddressLine2) ? parcel.senderAddressLine2 : "Udadelthotta,"}<br />
              {parcel.senderAddressLine3 && !/[\u0B80-\u0BFF]/.test(parcel.senderAddressLine3) ? parcel.senderAddressLine3 : "Galaha, Kandy."}
              {parcel.senderAddressLine4 && (<><br />{parcel.senderAddressLine4}</>)}
            </div>
            <div className="font-bold text-[9.5px] pt-0.5 text-black">
              Tel - {parcel.senderPhone || "0778054232"}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons for Single Receipt */}
      {showActions && !isPrintView && (
        <div className="flex items-center gap-1.5 mt-3 flex-wrap justify-center">
          <button
            type="button"
            onClick={handleCopyImage}
            title="இமேஜ் காப்பி செய்க (Copy Receipt Image)"
            className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy Image"}
          </button>

          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={downloading}
            title="இமேஜாக பதிவிறக்குக (Download PNG Image)"
            className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Download size={14} />
            PNG
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={downloading}
            title="PDF ஆக பதிவிறக்குக (Download Single PDF)"
            className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Download size={14} />
            PDF (A6)
          </button>

          <button
            type="button"
            onClick={handlePrint}
            title="அச்சிடுக (Print)"
            className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Printer size={14} />
            Print
          </button>
        </div>
      )}
    </div>
  );
}
