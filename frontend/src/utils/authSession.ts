// Define quién está autenticado en el front: un usuario normal o una institución
export type AuthActor = "user" | "institution";

// Estructura estándar de sesión que guardamos en localStorage
export interface AuthSession {
  token: string; // JWT o token de sesión
  role?: string; // rol opcional (ej: "INSTITUTION", "USER", "ADMIN"... según tu backend)
  actor: AuthActor; // tipo de actor autenticado (controla qué objeto guardamos)
  user?: any; // TODO: tipar con IUser cuando lo tengas (evita any en producción)
  institution?: any; // TODO: tipar con IInstitution cuando lo tengas (evita any en producción)
}

// LOCAL STORAGE KEYS (único lugar donde definimos las keys)
const TOKEN_KEY = "memorychain_token";
const ROLE_KEY = "memorychain_role";
const ACTOR_KEY = "memorychain_actor";
const USER_KEY = "memorychain_user";
const INSTITUTION_KEY = "memorychain_institution";

// Guarda token + actor + role + payload (user o institution)
export function saveAuthSession(session: AuthSession): void {
  const { token, role, actor, user, institution } = session;

  // Token siempre debe existir para considerar "logueado"
  localStorage.setItem(TOKEN_KEY, token);

  // Actor controla la “identidad activa” (user vs institution)
  localStorage.setItem(ACTOR_KEY, actor);

  // Role es opcional: si no viene, lo removemos para no dejar basura previa
  if (role) {
    localStorage.setItem(ROLE_KEY, role);
  } else {
    localStorage.removeItem(ROLE_KEY);
  }

  // Persistimos SOLO el objeto correspondiente al actor autenticado
  // y removemos el otro para evitar inconsistencias (ej: institución logueada pero user viejo guardado).
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
}

// Limpia todo rastro de autenticación en localStorage.
export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(ACTOR_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(INSTITUTION_KEY);
}

// Devuelve el token actual o null si no existe
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// Devuelve el rol actual (si fue guardado) o null
export function getAuthRole(): string | null {
  return localStorage.getItem(ROLE_KEY);
}

// Devuelve el actor actual si es válido; si no, null (estado corrupto o vacío)
export function getAuthActor(): AuthActor | null {
  const value = localStorage.getItem(ACTOR_KEY);
  if (value === "user" || value === "institution") return value;
  return null;
}


// Retorna el user guardado (si existe) o null si no hay o si el JSON está roto
export function getAuthUser(): any | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Retorna la institución guardada (si existe) o null si no hay o si el JSON está roto
export function getAuthInstitution(): any | null {
  const raw = localStorage.getItem(INSTITUTION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// HELPERS DE ID (evitan leer _id/id en cada componente)

// Obtiene el id del usuario SOLO si el actor activo es "user"
export function getIdUser(): string | null {
  const actor = getAuthActor();
  if (actor !== "user") return null;

  const user = getAuthUser();
  if (!user) return null;

  // Soporta _id (Mongo) o id (otros backends)
  return user._id ?? user.id ?? null;
}

// Obtiene el id de la institución SOLO si el actor activo es "institution"
export function getIdInstitution(): string | null {
  const actor = getAuthActor();
  if (actor !== "institution") return null;

  const inst = getAuthInstitution();
  if (!inst) return null;

  // Soporta _id (Mongo) o id (otros backends)
  return inst._id ?? inst.id ?? null;
}
