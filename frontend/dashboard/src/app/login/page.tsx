"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

export default function LoginPage() {
  const [role, setRole] = useState<"customer" | "agent">("customer");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    setLoading(true);
    try {
      const url =
        role === "customer"
          ? `${BASE_URL}/customer/join`
          : `${BASE_URL}/agent/join`;
        console.log('url', url);
        
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
       console.log('response', response);
       
      if (!response.ok) throw new Error("Login failed");
      const data = await response.json();
      console.log('data', data);
      sessionStorage.setItem("token", data.data.token);
      sessionStorage.setItem("role", role);
      sessionStorage.setItem(
        "id",
        role === "customer" ? data.data.customerId : data.data.agentId
      );

      router.push("/");
    } catch (err) {
      console.error(err);
      alert("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/10 p-8 shadow-xl backdrop-blur-md border border-white/20">
        <h1 className="mb-8 text-center text-3xl font-extrabold text-white tracking-wide">
          Welcome Back
        </h1>

        {/* Role Toggle */}
        <div className="mb-8 flex items-center justify-center">
          <div className="flex w-full max-w-xs rounded-full bg-white/20 p-1">
            <button
              onClick={() => setRole("customer")}
              className={`flex-1 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                role === "customer"
                  ? "bg-white text-purple-600 shadow-md"
                  : "text-white hover:text-gray-200"
              }`}
            >
              Customer
            </button>
            <button
              onClick={() => setRole("agent")}
              className={`flex-1 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                role === "agent"
                  ? "bg-white text-purple-600 shadow-md"
                  : "text-white hover:text-gray-200"
              }`}
            >
              Agent
            </button>
          </div>
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 py-3 text-white font-semibold shadow-lg hover:from-purple-700 hover:to-pink-600 transition-all duration-300 disabled:opacity-50"
        >
          {loading ? "Logging in..." : `Login as ${role}`}
        </button>
      </div>
    </div>
  );
}
