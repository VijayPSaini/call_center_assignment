"use client";

import { useSearchParams, useRouter } from "next/navigation";
import LiveKitRoomWrapper from "../view/LiveKitRoomWrapper";
import { useState } from "react";
import axios from "axios";

const LIVEKIT_URL = "wss://callcenterassignment-qe0jd6s0.livekit.cloud";
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL  || "http://localhost:3000"; // <-- set in .env.local

export default function RoomPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");
  const role = searchParams.get("role");
  const customerId = searchParams.get("customerId");
  const agentId = searchParams.get("agentId");
  const summary = searchParams.get("summary"); // ✅ new: summary from query

  const [isTransferring, setIsTransferring] = useState(false);

  if (!token || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg text-red-600">⚠️ Missing room data</p>
      </div>
    );
  }

  const handleTransferCall = async () => {
    if (!customerId || !agentId) {
      alert("Missing agent or customer info for transfer");
      return;
    }

    setIsTransferring(true);
    try {
      const response = await axios.post(`${BASE_URL}/customer/transfer-call`, {
        agentId,
        customerId,
      });

      if (response.status === 200) {
        alert("Call transferred successfully");
        router.push("/");
      } else {
        alert("Failed to transfer call");
      }
    } catch (err) {
      console.error("Transfer call error:", err);
      alert("Error while transferring call");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Live Call</h1>

      <div className="w-full max-w-3xl bg-white shadow-md rounded-xl p-6">
        {/* ✅ Show summary if available (only for agents) */}
        {role === "agent" && summary && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-left">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Previous Conversation Summary</h2>
            <p className="text-gray-700 whitespace-pre-line">{summary}</p>
          </div>
        )}

        <LiveKitRoomWrapper
          key={role + token}
          token={token}
          livekitUrl={LIVEKIT_URL}
          onDisconnected={() => router.push("/")}
        />

        {role === "agent" && (
          <button
            onClick={handleTransferCall}
            disabled={isTransferring}
            className={`mt-4 w-full rounded-lg px-4 py-3 text-white font-semibold transition-colors duration-200 ${
              isTransferring
                ? "bg-yellow-400 cursor-not-allowed"
                : "bg-yellow-600 hover:bg-yellow-700"
            }`}
          >
            {isTransferring ? "Transferring..." : "Transfer Call"}
          </button>
        )}

        <button
          onClick={() => router.push("/")}
          className="mt-4 w-full rounded-lg bg-red-600 px-4 py-3 text-white font-semibold hover:bg-red-700 transition-colors duration-200"
        >
          Leave Room
        </button>
      </div>
    </div>
  );
}
