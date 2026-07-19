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
