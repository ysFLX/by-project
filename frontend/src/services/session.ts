export type AppSession = {
  username: string;
  role: "admin" | "customer";
  companyCode?: string;
  displayName: string;
};

const sessionStorageKey = "maharet-yemek-session";

export function getStoredSession(): AppSession | null {
  try {
    const storedSession = window.localStorage.getItem(sessionStorageKey);

    if (!storedSession) {
      return null;
    }

    return JSON.parse(storedSession) as AppSession;
  } catch {
    window.localStorage.removeItem(sessionStorageKey);
    return null;
  }
}

export function saveSession(session: AppSession) {
  window.localStorage.setItem(sessionStorageKey, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(sessionStorageKey);
}

export function hasAdminSession() {
  return getStoredSession()?.role === "admin";
}
