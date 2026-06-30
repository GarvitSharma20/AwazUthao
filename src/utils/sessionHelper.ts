/**
 * Session Helper for AwazUthao
 * Handles local session creation, parsing user agents to extract clean OS and browser names,
 * and maintaining the current active session in the client.
 */

export interface SessionInfo {
  id: string;
  userId: string;
  userEmail: string | null;
  browser: string;
  os: string;
  createdAt: string;
  lastActive: string;
  isActive: boolean;
  ipPlaceholder?: string;
}

// Simple and robust User Agent parser
export function parseUserAgent(ua: string) {
  let browser = "Unknown Browser";
  let os = "Unknown OS";

  // Parse OS
  if (ua.indexOf("Win") !== -1) os = "Windows";
  else if (ua.indexOf("Mac") !== -1 && ua.indexOf("iPhone") === -1 && ua.indexOf("iPad") === -1) os = "macOS";
  else if (ua.indexOf("iPhone") !== -1) os = "iOS (iPhone)";
  else if (ua.indexOf("iPad") !== -1) os = "iOS (iPad)";
  else if (ua.indexOf("Android") !== -1) os = "Android";
  else if (ua.indexOf("Linux") !== -1) os = "Linux";

  // Parse Browser
  if (ua.indexOf("Firefox") !== -1) {
    browser = "Mozilla Firefox";
  } else if (ua.indexOf("SamsungBrowser") !== -1) {
    browser = "Samsung Internet";
  } else if (ua.indexOf("Opera") !== -1 || ua.indexOf("OPR") !== -1) {
    browser = "Opera";
  } else if (ua.indexOf("Edge") !== -1 || ua.indexOf("Edg") !== -1) {
    browser = "Microsoft Edge";
  } else if (ua.indexOf("Chrome") !== -1) {
    browser = "Google Chrome";
  } else if (ua.indexOf("Safari") !== -1) {
    browser = "Apple Safari";
  } else if (ua.indexOf("Trident") !== -1) {
    browser = "Internet Explorer";
  }

  return { browser, os };
}

const SESSION_KEY = "awazuthao_session_id";

export function getOrCreateSessionId(userId?: string): string {
  const key = userId ? `${SESSION_KEY}_${userId}` : SESSION_KEY;
  let id = localStorage.getItem(key);
  if (!id) {
    // Generate a random high-entropy session ID
    id = "sess_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(key, id);
  }
  return id;
}

export function clearLocalSession(userId?: string): void {
  const key = userId ? `${SESSION_KEY}_${userId}` : SESSION_KEY;
  localStorage.removeItem(key);
}
