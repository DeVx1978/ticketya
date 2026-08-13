/**
 * Rebrand a Columbus, lado frontend (13-ago-2026) -- la clave real
 * cambia de "ticketya_token" a "columbus_token". Cambiar el nombre de
 * golpe habria dejado deslogueado a cualquier usuario con sesion activa
 * hoy (localStorage no sabe de renombres, solo de claves exactas) --
 * en vez de eso, se hace una migracion silenciosa: la primera vez que
 * se lee el token, si esta bajo la clave vieja, se copia a la nueva y
 * se borra la vieja, sin que el usuario pierda su sesion ni lo note.
 * Decision reportada al director: preservar sesiones activas en vez de
 * forzar un logout masivo el dia del cambio.
 */
const CLAVE_TOKEN = "columbus_token";
const CLAVE_TOKEN_VIEJA = "ticketya_token";

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
  // Por si quedaba una sesión vieja en la clave anterior -- ya no debe
  // convivir con la nueva, para no confundir una futura limpieza manual.
  window.localStorage.removeItem(CLAVE_TOKEN_VIEJA);
}

export function obtenerToken(): string | null {
  if (typeof window === "undefined") return null;
  const tokenNuevo = window.localStorage.getItem(CLAVE_TOKEN);
  if (tokenNuevo) return tokenNuevo;
  // Migración silenciosa (13-ago-2026): sesión guardada antes del
  // rebrand, bajo el nombre viejo -- se traslada a la clave nueva sin
  // desloguear a quien ya tenía la sesión abierta.
  const tokenViejo = window.localStorage.getItem(CLAVE_TOKEN_VIEJA);
  if (tokenViejo) {
    window.localStorage.setItem(CLAVE_TOKEN, tokenViejo);
    window.localStorage.removeItem(CLAVE_TOKEN_VIEJA);
    return tokenViejo;
  }
  return null;
}

export function borrarToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CLAVE_TOKEN);
  window.localStorage.removeItem(CLAVE_TOKEN_VIEJA);
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

const CLAVE_SESION_INVITADO = "columbus_sesion_invitado";

/**
 * Item 31, Fase 7 (11-ago-2026) -- compra como invitado (sin cuenta).
 * Mismo patron de guardado simple que el token, pero esto NUNCA
 * identifica a una cuenta real -- solo enlaza el bloqueo del asiento
 * con la compra final del mismo invitado, dentro del mismo navegador.
 * Si ya existe una guardada, se reutiliza (mismo invitado siguiendo su
 * propio flujo); si no, se genera una nueva.
 */
export function obtenerOCrearSesionInvitado(): string {
  if (typeof window === "undefined") return "";
  const existente = window.localStorage.getItem(CLAVE_SESION_INVITADO);
  if (existente) return existente;
  const nueva = crypto.randomUUID();
  window.localStorage.setItem(CLAVE_SESION_INVITADO, nueva);
  return nueva;
}
