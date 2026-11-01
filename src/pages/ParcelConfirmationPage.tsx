import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { 
  getParcelDeliveryById,
  updateParcelDelivery, 
  ParcelDelivery 
} from "../lib/db";
import { 
  Package, 
  CheckCircle2, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  Home,
  Check,
  ShieldCheck,
  Calendar
} from "lucide-react";

export default function ParcelConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const parcelIdOrToken = id || searchParams.get("parcel_confirm") || searchParams.get("id") || "";
  
  // Fast URL fallback data
  const urlRoll = searchParams.get("roll") || "";
  const urlName = searchParams.get("name") || "";
  const urlPhone = searchParams.get("phone") || "";
  const urlTrk = searchParams.get("trk") || "";

  // Instant State initialization so mobile opens immediately without waiting wheel
  const [parcel, setParcel] = useState<ParcelDelivery | null>(() => {
    if (urlName || urlRoll) {
      return {
        id: parcelIdOrToken || `parcel_${Date.now()}`,
        trackingNumber: urlTrk || (parcelIdOrToken.startsWith('AGD-') ? parcelIdOrToken : `AGD-${parcelIdOrToken.slice(-6) || 'ONLINE'}`),
        studentRollNo: urlRoll,
        rollNo: urlRoll,
        studentName: urlName,
        phone: urlPhone,
        addressLine1: "",
        addressLine2: "",
        addressLine3: "",
        senderName: "D. Dineshkumar",
        senderAcademy: "Agaram Dhinesh Online Academy",
        senderAddressLine1: "No. 111/2, Pahalagamma,",
        senderAddressLine2: "Udadelthotta,",
        senderAddressLine3: "Galaha, Kandy.",
        senderPhone: "0778054232",
        status: "dispatched",
        dispatchedDate: new Date().toISOString().split("T")[0],
        createdAt: Date.now()
      };
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(!urlName && !urlRoll);
  const [updating, setUpdating] = useState(false);
  const [confirmedSuccess, setConfirmedSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchParcel = async () => {
      if (!parcelIdOrToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const found = await getParcelDeliveryById(parcelIdOrToken);
        if (isMounted) {
          if (found) {
            setParcel(found);
            if (found.status === "delivered") {
              setConfirmedSuccess(true);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching parcel:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchParcel();

    return () => {
      isMounted = false;
    };
  }, [parcelIdOrToken]);

  const handleConfirmDelivery = async () => {
    if (!parcel) return;

    try {
      setUpdating(true);
      const now = new Date();
      const deliveredDateStr = now.toLocaleDateString("en-GB") + " " + now.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true });

      await updateParcelDelivery(parcel.id, {
        status: "delivered",
        deliveredDate: deliveredDateStr
      });

      setParcel(prev => prev ? { ...prev, status: "delivered", deliveredDate: deliveredDateStr } : null);
      setConfirmedSuccess(true);
    } catch (err: any) {
      console.error("Error confirming delivery:", err);
      alert("உறுதிப்படுத்துவதில் பிழை: " + (err?.message || err));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 text-white py-4 px-6 shadow-md border-b border-slate-800">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-md">
              <Package size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-wide leading-tight">
                Agaram Dhines Online Academy
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                டியூட் & பார்சல் உறுதிப்படுத்தல் சேவை (Parcel Delivery Confirmation)
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/")}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="முகப்புப் பக்கத்திற்குச் செல்க"
          >
            <Home size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-200">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs sm:text-sm font-semibold text-slate-600">பார்சல் விபரங்கள் சரிபார்க்கப்படுகின்றன...</p>
          </div>
        ) : !parcel ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-200">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={28} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              பார்சல் விபரம் கிடைக்கவில்லை
            </h2>
            <p className="text-xs text-slate-600 max-w-sm mx-auto mb-6 leading-relaxed">
              நீங்கள் உள்ளிட்ட அல்லது ஸ்கேன் செய்த QR குறியீட்டிற்குரிய பார்சல் பதிவு Database-ல் கிடைக்கவில்லை.
            </p>
            <button
              onClick={() => navigate("/")}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
            >
              முகப்புப் பக்கத்திற்குத் திரும்புக
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
            {/* Status Banner */}
            <div className={`p-4 text-white text-center font-bold text-xs flex items-center justify-center gap-2 ${
              parcel.status === "delivered" || confirmedSuccess
                ? "bg-gradient-to-r from-emerald-600 to-teal-600" 
                : "bg-gradient-to-r from-amber-500 to-orange-500"
            }`}>
              {parcel.status === "delivered" || confirmedSuccess ? (
                <>
                  <CheckCircle2 size={18} />
                  <span>பார்சல் வெற்றிகரமாகப் பெறப்பட்டது (Delivered)</span>
                </>
              ) : (
                <>
                  <Clock size={18} />
                  <span>அனுப்பப்பட்டுள்ளது - உறுதிப்படுத்த வேண்டியுள்ளது (In Transit)</span>
                </>
              )}
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {/* Recipient Information Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-2">
                  மாணவர் மற்றும் முகவரி விபரங்கள் (Recipient Details)
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                      <User size={14} className="text-emerald-600" /> மாணவர் பெயர்:
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm">{parcel.studentName}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-semibold">ரோல் எண் (Roll No):</span>
                    <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                      {parcel.studentRollNo || parcel.rollNo || "—"}
                    </span>
                  </div>

                  {parcel.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                        <Phone size={14} className="text-indigo-600" /> தொலைபேசி:
                      </span>
                      <span className="font-bold text-slate-800">{parcel.phone}</span>
                    </div>
                  )}

                  {(parcel.addressLine1 || parcel.fullAddress) && (
                    <div className="pt-2 border-t border-slate-200/80">
                      <span className="text-slate-600 font-semibold flex items-center gap-1.5 mb-1">
                        <MapPin size={14} className="text-rose-600" /> விநியோக முகவரி:
                      </span>
                      <div className="text-slate-800 font-medium pl-5 leading-relaxed text-[11px]">
                        {parcel.addressLine1 && <div>{parcel.addressLine1}</div>}
                        {parcel.addressLine2 && <div>{parcel.addressLine2}</div>}
                        {parcel.addressLine3 && <div>{parcel.addressLine3}</div>}
                        {parcel.addressLine4 && <div>{parcel.addressLine4}</div>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Package Particulars */}
              <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">பார்சல் அடையாள எண் (Tracking ID):</span>
                  <span className="font-mono font-extrabold text-indigo-700">{parcel.trackingNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">அனுப்பப்பட்ட திகதி:</span>
                  <span className="font-bold text-slate-800">{parcel.dispatchedDate}</span>
                </div>
                {parcel.deliveredDate && (
                  <div className="flex items-center justify-between text-emerald-800 bg-emerald-50 p-2 rounded-lg font-semibold">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} /> பெறப்பட்ட திகதி & நேரம்:
                    </span>
                    <span className="font-bold">{parcel.deliveredDate}</span>
                  </div>
                )}
                {parcel.itemsDescription && (
                  <div className="pt-1.5 border-t border-slate-100">
                    <span className="text-slate-500 font-semibold block mb-0.5">பொதி விபரம் (Items):</span>
                    <span className="text-slate-800 font-bold">{parcel.itemsDescription}</span>
                  </div>
                )}
              </div>

              {/* Confirmation Action Area */}
              {parcel.status === "delivered" || confirmedSuccess ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center space-y-2">
                  <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <Check size={28} className="stroke-[3]" />
                  </div>
                  <h3 className="text-base font-extrabold text-emerald-900">
                    பார்சல் வெற்றிகரமாக உறுதிப்படுத்தப்பட்டது!
                  </h3>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    அகரம் தினேஸ் ஆன்லைன் அகாடமியின் டியூட் பொதி தங்களுக்குக் கிடைத்தமை டேட்டாபேஸில் வெற்றிகரமாகப் பதிவுசெய்யப்பட்டுள்ளது. நன்றி!
                  </p>
                </div>
              ) : (
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-5 text-center space-y-4">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 mb-1">
                      உங்களுக்கு இந்த டியூட் பார்சல் கிடைத்துவிட்டதா?
                    </h3>
                    <p className="text-xs text-slate-600">
                      பார்சலை நீங்கள் பெற்றுக்கொண்டிருந்தால் கீழே உள்ள பொத்தானை அழுத்தி உறுதிப்படுத்தவும்.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmDelivery}
                    disabled={updating}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] text-white font-black text-sm sm:text-base rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {updating ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <CheckCircle2 size={20} className="stroke-[2.5]" />
                        <span>சரி, பார்சல் கிடைத்துவிட்டது (OK, Received)</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Sender Reference */}
              <div className="pt-2 text-[11px] text-center text-slate-500 font-medium">
                அனுப்புநர்: <span className="font-bold text-slate-700">{parcel.senderName}</span> | அகாடமி தொடர்பு: <span className="font-bold text-slate-700">{parcel.senderPhone}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-500 py-3 border-t border-slate-200 bg-white">
        © {new Date().getFullYear()} Agaram Dhines Online Academy. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.
      </footer>
    </div>
  );
}
