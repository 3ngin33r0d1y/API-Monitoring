export type SessionUser = {
  username: string;
  authorities?: any;
};

const KEY = "sessionUser";

export function saveSession(user: SessionUser) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function loadSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as SessionUser : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
}
