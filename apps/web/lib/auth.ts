const CLAVE_TOKEN = "ticketya_token";

/**
 * Guardado simple en localStorage — suficiente para esta etapa
 * (pasajero comprando). Si más adelante se necesita algo más robusto
 * (refresh tokens, expiración silenciosa), esto es lo único que habría
 * que tocar; el resto de la app solo llama a estas 3 funciones, nunca a
 * localStorage directamente.
 */
export function guardarToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLAVE_TOKEN, token);
}

export function obtenerToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CLAVE_TOKEN);
}

export function borrarToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CLAVE_TOKEN);
}

/** Forma del payload que emite el backend — ver dominio/auth/auth.ports.ts (PayloadToken). */
export type PayloadToken = {
  sub: string;
  rol: "pasajero" | "vendedor" | "admin_cooperativa" | "admin_plataforma" | "super_admin";
  cooperativaId: string | null;
  iat: number;
  exp: number;
};

/**
 * Decodifica el payload del JWT SOLO para decisiones de interfaz
 * (a qué panel redirigir, qué menú mostrar) — nunca para decisiones de
 * seguridad. No verifica la firma (no puede, no tiene la clave secreta);
 * la única verificación real ocurre en el backend en cada petición. Si
 * alguien manipulara el token a mano, la interfaz podría redirigirlo mal,
 * pero cualquier llamada real a la API sería rechazada igual.
 */
export function decodificarToken(token: string): PayloadToken | null {
  try {
    const partes = token.split(".");
    if (partes.length !== 3) return null;
    const payloadJson = atob(partes[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payloadJson) as PayloadToken;
  } catch {
    return null;
  }
}

/** true si el token ya expiró (o no se pudo leer) — solo para UX, mismo criterio de arriba. */
export function tokenExpirado(payload: PayloadToken): boolean {
  return Date.now() >= payload.exp * 1000;
}

/**
 * Token guardado Y todavía vigente, en una sola llamada — hallazgo
 * real del 22-jul-2026: varias pantallas solo revisaban "¿existe un
 * token guardado?" (obtenerToken() truthy), no si ya había expirado.
 * Eso dejaba pasar un token vencido hasta el backend, que lo rechazaba
 * con un "Unauthorized" crudo, sin que el usuario entendiera qué pasó
 * ni lo mandaran de vuelta a iniciar sesión. Usar esta función en vez
 * de `obtenerToken()` a secas evita repetir ese hueco en pantallas
 * nuevas.
 */
export function tokenValido(): string | null {
  const token = obtenerToken();
  if (!token) return null;
  const payload = decodificarToken(token);
  if (!payload || tokenExpirado(payload)) return null;
  return token;
}
