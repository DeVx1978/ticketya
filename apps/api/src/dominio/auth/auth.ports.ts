/**
 * Interfaces (puertos) del dominio de autenticación — RF-AUTH.
 *
 * Nada en este archivo depende de NestJS, Drizzle, bcrypt ni JWT. La capa
 * de infraestructura implementa estas interfaces con la tecnología
 * concreta elegida (ver infraestructura/auth/).
 */

/** Forma mínima de un usuario que el dominio necesita conocer. */
export interface UsuarioDominio {
  id: string;
  rol: 'pasajero' | 'vendedor' | 'admin_cooperativa' | 'admin_plataforma';
  cooperativaId: string | null;
  correo: string;
  nombreCompleto: string;
  telefono: string | null;
  fotoUrl: string | null;
  creadoEn: Date;
  passwordHash: string | null;
  intentosFallidos: number;
  bloqueadoHasta: Date | null;
  correoVerificado: boolean;
  activo: boolean;
}

export interface DatosRegistro {
  correo: string;
  password: string;
  nombreCompleto: string;
  cedula?: string;
  telefono?: string;
}

/**
 * Puerto hacia la capa de infraestructura para todo lo que necesita leer
 * o escribir usuarios. La capa de aplicación depende de esta interfaz,
 * nunca de Drizzle directamente (Arquitectura Técnica, sección 2).
 */
export interface UsuarioRepositorio {
  buscarPorCorreo(correo: string): Promise<UsuarioDominio | null>;
  buscarPorId(id: string): Promise<UsuarioDominio | null>;
  crearPasajero(datos: DatosRegistro): Promise<UsuarioDominio>;
  registrarIntentoFallido(
    usuarioId: string,
    intentos: number,
    bloqueadoHasta: Date | null,
  ): Promise<void>;
  reiniciarIntentosFallidos(usuarioId: string): Promise<void>;

  /** Perfil (22-jul-2026) — nombre, teléfono, foto; solo se tocan los campos enviados. */
  actualizarPerfil(
    usuarioId: string,
    datos: {
      nombreCompleto?: string;
      telefono?: string;
      fotoUrl?: string | null;
    },
  ): Promise<void>;

  actualizarPasswordHash(usuarioId: string, nuevoHash: string): Promise<void>;

  /** Solo tiene sentido para 'pasajero' — cuenta boletos con estado 'usado'. */
  contarViajesCompletados(usuarioId: string): Promise<number>;

  guardarTokenReset(
    usuarioId: string,
    tokenHash: string,
    expiraEn: Date,
  ): Promise<void>;

  buscarTokenResetVigente(
    tokenHash: string,
  ): Promise<{ id: string; usuarioId: string } | null>;

  marcarTokenResetUsado(tokenId: string): Promise<void>;

  /** 27-jul-2026 -- verificacion de correo al registrarse (RF-AUTH-001). Mismo mecanismo que reset_password, proposito distinto. */
  guardarTokenVerificacion(
    usuarioId: string,
    tokenHash: string,
    expiraEn: Date,
  ): Promise<void>;

  buscarTokenVerificacionVigente(
    tokenHash: string,
  ): Promise<{ id: string; usuarioId: string } | null>;

  marcarTokenVerificacionUsado(tokenId: string): Promise<void>;

  marcarCorreoVerificado(usuarioId: string): Promise<void>;
}

export interface NotificadorEmail {
  enviarResetPassword(correo: string, tokenPlano: string): Promise<void>;

  enviarConfirmacionCompra(
    correo: string,
    detalle: { compraId: string; montoTotal: number; cantidadBoletos: number },
  ): Promise<void>;

  enviarVerificacionCorreo(correo: string, tokenPlano: string): Promise<void>;
}

/**
 * 27-jul-2026 -- almacenamiento de archivos (fotos de perfil, logo de
 * cooperativa). Mismo criterio que NotificadorEmail/PasarelaPago: el
 * simulador guarda el archivo real en disco local; al final se
 * reemplaza por Cloudinary/S3 sin tocar nada mas del sistema.
 */
export interface ArchivoSubido {
  url: string;
  nombreArchivo: string;
}

export interface AlmacenamientoArchivos {
  guardarImagen(
    buffer: Buffer,
    nombreOriginal: string,
    carpeta: string,
  ): Promise<ArchivoSubido>;
}

/** Puerto de hashing de contraseñas — la capa de infra decide el algoritmo. */
export interface HasherContrasena {
  hash(passwordPlano: string): Promise<string>;
  comparar(passwordPlano: string, hash: string): Promise<boolean>;
}

/** Puerto de emisión/verificación de tokens de sesión. */
export interface EmisorTokens {
  firmar(payload: PayloadToken): string;
}

export interface PayloadToken {
  sub: string; // id de usuario
  rol: UsuarioDominio['rol'];
  cooperativaId: string | null;
}

/**
 * RF-AUTH-002 — regla de negocio pura sobre bloqueo por intentos
 * fallidos.
 *
 * ⚠ Simplificación consciente respecto al criterio de aceptación exacto
 * del SRS ("tras 5 intentos fallidos EN 10 MINUTOS"): esta implementación
 * bloquea tras 5 intentos fallidos acumulados (sin ventana deslizante de
 * tiempo), porque la tabla `usuarios` no tiene una columna de "último
 * intento fallido" para saber si esos 5 intentos ocurrieron dentro de una
 * ventana de 10 minutos o distribuidos a lo largo de semanas. Implementar
 * la semántica exacta de ventana deslizante requiere una migración de
 * esquema adicional (columna `ultimo_intento_fallido_en`), que no se hizo
 * en este paso — queda como mejora pendiente, no como algo ya resuelto.
 * El conteo se reinicia en cada login exitoso y también cuando el bloqueo
 * actual ya expiró (ver `cuentaEstaBloqueada`).
 *
 * MINUTOS_BLOQUEO (duración del bloqueo en sí) tampoco está especificado
 * por el SRS — es un valor por defecto razonable, no un requisito.
 */
export const MAX_INTENTOS_FALLIDOS = 5;
export const MINUTOS_BLOQUEO = 15;

export function calcularBloqueoTrasIntentoFallido(intentosActuales: number): {
  nuevoConteo: number;
  bloqueadoHasta: Date | null;
} {
  const nuevoConteo = intentosActuales + 1;
  if (nuevoConteo >= MAX_INTENTOS_FALLIDOS) {
    const bloqueadoHasta = new Date(Date.now() + MINUTOS_BLOQUEO * 60 * 1000);
    return { nuevoConteo, bloqueadoHasta };
  }
  return { nuevoConteo, bloqueadoHasta: null };
}

export function cuentaEstaBloqueada(bloqueadoHasta: Date | null): boolean {
  if (!bloqueadoHasta) return false;
  return bloqueadoHasta.getTime() > Date.now();
}
