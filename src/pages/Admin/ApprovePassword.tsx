import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPasswordRequests, savePasswordRequests } from "../../lib/db";
import { CheckCircle, XCircle } from "lucide-react";

export default function ApprovePassword() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequest = async () => {
      const requests = await getPasswordRequests();
      const req = requests.find((r: any) => r.id === id);
      setRequest(req);
      setLoading(false);
    };
    fetchRequest();
  }, [id]);

  const handleAction = async (action: 'approved' | 'rejected') => {
    const requests = await getPasswordRequests();
    const updatedRequests = requests.map((r: any) => 
      r.id === id ? { ...r, status: action } : r
    );
    await savePasswordRequests(updatedRequests);
    setRequest({ ...request, status: action });
    alert(`Password reset request has been ${action}.`);
    navigate("/admin");
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!request) {
    return <div className="p-8 text-center text-red-500">Request not found.</div>;
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Password Reset Request</h2>
      
      <div className="space-y-4 mb-8">
        <div className="flex justify-between border-b pb-2">
          <span className="text-gray-500">User Type:</span>
          <span className="font-semibold capitalize">{request.type}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-gray-500">User ID:</span>
          <span className="font-semibold">{request.userId}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="text-gray-500">Status:</span>
          <span className={`font-semibold capitalize ${
            request.status === 'pending' ? 'text-yellow-500' :
            request.status === 'approved' ? 'text-emerald-500' : 'text-red-500'
          }`}>{request.status}</span>
        </div>
      </div>

      {request.status === 'pending' ? (
        <div className="flex gap-4">
          <button
            onClick={() => handleAction('rejected')}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <XCircle size={20} />
              <span>Reject</span>
            </div>
            <span className="text-xs font-normal">மாற்ற முடியாது</span>
          </button>
          <button
            onClick={() => handleAction('approved')}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CheckCircle size={20} />
              <span>Approve</span>
            </div>
            <span className="text-xs font-normal">ஆம் மாற்றலாம்</span>
          </button>
        </div>
      ) : (
        <div className="text-center">
          <button
            onClick={() => navigate("/admin")}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
