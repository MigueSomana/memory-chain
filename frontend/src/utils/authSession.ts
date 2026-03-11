// Define quién está autenticado en el front: un usuario normal o una institución
export type AuthActor = "user" | "institution";

// Estructura estándar de sesión que guardamos en localStorage
export interface AuthSession {
  token: string; // JWT o token de sesión
  role?: string; // rol opcional (ej: "INSTITUTION", "USER", "ADMIN"...)
  actor: AuthActor; // tipo de actor autenticado
  user?: any; // TODO: tipar
  institution?: any; // TODO: tipar
}

// LOCAL STORAGE KEYS (único lugar donde definimos las keys)
const TOKEN_KEY = "memorychain_token";
const ROLE_KEY = "memorychain_role";
const ACTOR_KEY = "memorychain_actor";
const USER_KEY = "memorychain_user";
const INSTITUTION_KEY = "memorychain_institution";

// ✅ NUEVO: control de inactividad
const LAST_ACTIVITY_KEY = "memorychain_last_activity";

// 8 horas de inactividad
export const DEFAULT_MAX_IDLE_MS = 8 * 60 * 60 * 1000;

const now = () => Date.now();

// ✅ Marca actividad (solo si hay token)
export function touchAuthSession(): void {
  if (!localStorage.getItem(TOKEN_KEY)) return;
  localStorage.setItem(LAST_ACTIVITY_KEY, String(now()));
}

// Guarda token + actor + role + payload (user o institution)
export function saveAuthSession(session: AuthSession): void {
  const { token, role, actor, user, institution } = session;

  // Token siempre debe existir para considerar "logueado"
  localStorage.setItem(TOKEN_KEY, token);

  // Actor controla la “identidad activa” (user vs institution)
  localStorage.setItem(ACTOR_KEY, actor);

  // Role es opcional: si no viene, lo removemos para no dejar basura previa
  if (role) localStorage.setItem(ROLE_KEY, role);
  else localStorage.removeItem(ROLE_KEY);

  // Persistimos SOLO el objeto correspondiente al actor autenticado
  if (actor === "user" && user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.removeItem(INSTITUTION_KEY);
  } else if (actor === "institution" && institution) {
    localStorage.setItem(INSTITUTION_KEY, JSON.stringify(institution));
    localStorage.removeItem(USER_KEY);
  } else {
    // Si algo no cuadra (actor sin payload), limpiamos ambos
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(INSTITUTION_KEY);
  }

  // ✅ NUEVO: al guardar sesión, arranca contador de inactividad
  touchAuthSession();
}

// Limpia todo rastro de autenticación en localStorage.
export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(ACTOR_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(INSTITUTION_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
}

// Devuelve el token actual o null si no existe
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// Devuelve el rol actual (si fue guardado) o null
export function getAuthRole(): string | null {
  return localStorage.getItem(ROLE_KEY);
}

// Devuelve el actor actual si es válido; si no, null
export function getAuthActor(): AuthActor | null {
  const value = localStorage.getItem(ACTOR_KEY);
  if (value === "user" || value === "institution") return value;
  return null;
}

// Retorna el user guardado o null si no hay o el JSON está roto
export function getAuthUser(): any | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Retorna la institución guardada o null
export function getAuthInstitution(): any | null {
  const raw = localStorage.getItem(INSTITUTION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// HELPERS DE ID

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

// ===================== INACTIVITY / EXPIRATION =====================

export function getLastActivityMs(): number | null {
  const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function isSessionExpired(
  maxIdleMs: number = DEFAULT_MAX_IDLE_MS,
): boolean {
  const token = getAuthToken();
  if (!token) return true;

  const last = getLastActivityMs();
  if (!last) return false; // si no existe, no forzamos logout

  return now() - last > maxIdleMs;
}

// Si expiró, limpia sesión y retorna true
export function enforceSessionLifetime(
  maxIdleMs: number = DEFAULT_MAX_IDLE_MS,
): boolean {
  if (isSessionExpired(maxIdleMs)) {
    clearAuthSession();
    return true;
  }
  return false;
}

// ✅ Inicializa listeners globales para:
// - refrescar lastActivity con interacción
// - chequear expiración y hacer logout automático
export function initAuthSessionInactivityGuard(opts?: {
  maxIdleMs?: number;
  checkEveryMs?: number;
  onLogout?: () => void;
}): () => void {
  const maxIdleMs = opts?.maxIdleMs ?? DEFAULT_MAX_IDLE_MS;
  const checkEveryMs = opts?.checkEveryMs ?? 60_000; // 1 min

  const onLogout =
    opts?.onLogout ??
    (() => {
      window.location.assign("/");
    });

  // Si ya está expirada al arrancar, fuera
  if (enforceSessionLifetime(maxIdleMs)) {
    onLogout();
    return () => {};
  }

  const bump = () => {
    if (!getAuthToken()) return;

    // si ya expiró
    if (enforceSessionLifetime(maxIdleMs)) {
      onLogout();
      return;
    }

    touchAuthSession();
  };

  const events: Array<keyof WindowEventMap> = [
    "click",
    "keydown",
    "mousemove",
    "scroll",
    "touchstart",
  ];

  events.forEach((ev) => window.addEventListener(ev, bump, { passive: true }));

  const vis = () => {
    if (document.visibilityState === "visible") {
      if (enforceSessionLifetime(maxIdleMs)) onLogout();
      else bump();
    }
  };
  document.addEventListener("visibilitychange", vis);

  const interval = window.setInterval(() => {
    if (!getAuthToken()) return;
    if (enforceSessionLifetime(maxIdleMs)) onLogout();
  }, checkEveryMs);

  return () => {
    events.forEach((ev) => window.removeEventListener(ev, bump as any));
    document.removeEventListener("visibilitychange", vis);
    window.clearInterval(interval);
  };
}

// ✅ helper: headers siempre frescos (evita token congelado)
export function getAuthHeaders(): Record<string, string> {
  const t = getAuthToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}