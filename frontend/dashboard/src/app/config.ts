// config.ts

// Base URL of your backend API
export const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

// You can also store other constants here
export const LIVEKIT_URL =
  process.env.NEXT_PUBLIC_LIVEKIT_URL ||
  "wss://callcenterassignment-qe0jd6s0.livekit.cloud";

// Example: Default headers
export const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};
