export type AuthActor = "user" | "institution";

export interface AuthSession {
  token: string;
  role?: string;
  actor: AuthActor;
  user?: any; // puedes tipar esto después con tu interfaz IUser
  institution?: any; // idem con tu interfaz IInstitution
}

const TOKEN_KEY = "memorychain_token";
const ROLE_KEY = "memorychain_role";
const ACTOR_KEY = "memorychain_actor";
const USER_KEY = "memorychain_user";
const INSTITUTION_KEY = "memorychain_institution";
export function saveAuthSession(session: AuthSession): void {
  const { token, role, actor, user, institution } = session;

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ACTOR_KEY, actor);

  if (role) {
    localStorage.setItem(ROLE_KEY, role);
  } else {
    localStorage.removeItem(ROLE_KEY);
  }

  if (actor === "user" && user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.removeItem(INSTITUTION_KEY);

  } else if (actor === "institution" && institution) {
    localStorage.setItem(INSTITUTION_KEY, JSON.stringify(institution));
    localStorage.removeItem(USER_KEY);
  } else {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(INSTITUTION_KEY);
  }
}

export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(ACTOR_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(INSTITUTION_KEY);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAuthRole(): string | null {
  return localStorage.getItem(ROLE_KEY);
}

export function getAuthActor(): AuthActor | null {
  const value = localStorage.getItem(ACTOR_KEY);
  if (value === "user" || value === "institution") return value;
  return null;
}

export function getAuthUser(): any | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getAuthInstitution(): any | null {
  const raw = localStorage.getItem(INSTITUTION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getIdUser(): string | null {
  const actor = getAuthActor();
  if (actor !== "user") return null;

  const user = getAuthUser();
  if (!user) return null;

  return user._id ?? user.id ?? null;
}

export function getIdInstitution(): string | null {
  const actor = getAuthActor();
  if (actor !== "institution") return null;

  const inst = getAuthInstitution();
  if (!inst) return null;

  return inst._id ?? inst.id ?? null;
}
