"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AgentNotification } from "./types/types";
import NotificationModal from "./view/notification_modal";
import { connectAgentSocket, disconnectSocket } from "./model/socket_service";
import { respondToCall as controllerRespondToCall } from "./controllers/agent_controller";

export default function HomePage() {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null); // agentId or customerId
  const [notification, setNotification] = useState<AgentNotification | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

  // Load session info
  useEffect(() => {
    const storedToken = sessionStorage.getItem("token");
    const storedRole = sessionStorage.getItem("role");
    const storedId = sessionStorage.getItem("id");

    if (!storedToken || !storedRole || !storedId) {
      router.replace("/login");
    } else {
      setToken(storedToken);
      setRole(storedRole);
      setUserId(storedId);
    }
    setLoading(false);
  }, [router]);

  // Connect Socket.IO for agents
  useEffect(() => {
    if (role !== "agent" || !userId) return;
    connectAgentSocket(userId, setNotification);
    return () => disconnectSocket();
  }, [role, userId]);

  const handleLogout = () => {
    sessionStorage.clear();
    router.replace("/login");
  };

  // Agent responds to call
  const respondToCall = async (accepted: boolean) => {
    if (!notification || !userId) return;

    const responseData = await controllerRespondToCall(userId, notification, accepted);

    if (!responseData) {
      alert("⚠️ Failed to send response");
      return;
    }

    if (accepted) {
      const livekitToken = responseData.data.token;
      const summary = responseData.data.summary || null;
      console.log('summary from backend after agent accept call',summary);
      
      const customerId = responseData.data.customerId;

      const queryParams = new URLSearchParams({
        token: livekitToken,
        role: "agent",
        agentId: userId,
        customerId,
      });

      if (summary) queryParams.set("summary", summary);

      router.replace(`/room?${queryParams.toString()}`);
    }

    setNotification(null);
  };

  // Customer joins room
  const handleCustomerJoin = () => {
    if (!token || !userId || !API_BASE_URL) {
      alert("Missing token, userId, or API_BASE_URL. Please try again.");
      return;
    }

    // Fire-and-forget start-recording
    void fetch(`${API_BASE_URL}/customer/start-recording`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomName: userId }),
    }).catch(err => console.error("Failed to start recording:", err));

    // Navigate immediately
    router.replace(`/room?token=${encodeURIComponent(token)}&role=customer&customerId=${userId}`);
  };

  if (loading || !role || !userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-4">Home Page</h1>
        <p className="mb-2 text-gray-700">
          Logged in as: <b>{role}</b>
        </p>

        {/* Customer Join Button */}
        {role === "customer" && API_BASE_URL && token && userId && (
          <button
            onClick={handleCustomerJoin}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Join Audio Room
          </button>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="mt-4 w-full rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Logout
        </button>
      </div>

      {/* Agent Notification Modal */}
      {notification && role === "agent" && (
        <NotificationModal notification={notification} onRespond={respondToCall} />
      )}
    </div>
  );
}
