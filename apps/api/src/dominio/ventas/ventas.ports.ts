/**
 * Dominio de ventas — RF-CHECK, RN-001, RN-002.
 */

export type TipoTarifa = 'adulto' | 'nino' | 'tercera_edad' | 'discapacidad';

/**
 * RN-001 — tarifas diferenciadas (LOTTTSV Art. 79).
 *
 * ⚠ Para 'discapacidad' el descuento real va del 25% al 80% "según
 * porcentaje de discapacidad certificado por el CONADIS, verificable
 * mediante carnet" — este sistema todavía no captura ni verifica ese
 * carnet/porcentaje individual (no hay UI ni tabla para eso). Se usa
 * 50% como valor intermedio de marcador de posición, NO como el
 * descuento real que le corresponde a cada persona — dejar esto tal
 * cual sería incorrecto en producción real; hace falta construir la
 * verificación de carnet CONADIS antes de cerrar esto como resuelto.
 */
export function factorDescuento(tipoTarifa: TipoTarifa): number {
  switch (tipoTarifa) {
    case 'adulto':
      return 1;
    case 'nino':
      return 0.5;
    case 'tercera_edad':
      return 0.5;
    case 'discapacidad':
      return 0.5; // ⚠ placeholder, ver nota arriba — no es el valor real caso por caso.
  }
}

/** RF-MENOR-001 — detección de menor de edad por tarifa o fecha de nacimiento. */
export function esMenorDeEdad(
  tipoTarifa: TipoTarifa,
  fechaNacimiento: string | null | undefined,
): boolean {
  if (tipoTarifa === 'nino') return true;
  if (!fechaNacimiento) return false;
  const nacimiento = new Date(fechaNacimiento);
  const edadMs = Date.now() - nacimiento.getTime();
  const edadAnios = edadMs / (1000 * 60 * 60 * 24 * 365.25);
  return edadAnios < 18;
}

export interface PasajeroCheckout {
  viajeId: string;
  numeroAsiento: string;
  nombreCompleto: string;
  documento: string;
  tipoTarifa: TipoTarifa;
  fechaNacimiento?: string;
}

export interface DesgloseAsiento {
  viajeId: string;
  numeroAsiento: string;
  cooperativaId: string;
  precioPagado: number;
  tasaTerminal: number;
  cargoPlataforma: number;
  /** Porción de precioPagado que corresponde a IVA — el precio YA lo trae incluido, esto es solo el desglose informativo. */
  ivaMonto: number;
  /** Si la cooperativa decide mostrar el desglose de IVA en el boleto (puede pagarlo igual y no mostrarlo). */
  ivaVisible: boolean;
}

export interface ResultadoPago {
  aprobado: boolean;
  referenciaExterna: string;
  motivoRechazo?: string;
}

/** Puerto hacia la pasarela de pago — la capa de infra decide el proveedor real. */
export interface PasarelaPago {
  procesar(montoTotal: number, idempotencyKey: string): Promise<ResultadoPago>;
}

export interface BoletoEmitido {
  id: string;
  codigoQr: string;
  numeroAsiento: string;
  precioPagado: number;
  tasaTerminal: number;
  cargoPlataforma: number;
  ivaMonto: number;
}

export interface PagoExistente {
  compraId: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'revertido';
  boletos: BoletoEmitido[];
}

export interface MapeoAsientoPasajero {
  viajeId: string;
  numeroAsiento: string;
  pasajeroCompraId: string;
  cooperativaId: string;
  precioPagado: number;
  tasaTerminal: number;
  cargoPlataforma: number;
  ivaMonto: number;
}

export interface CompraRepositorio {
  /** RF-CHECK-005 — idempotencia: si ya existe un pago con esta clave, devuelve su resultado sin reprocesar. */
  buscarPagoPorIdempotencyKey(
    idempotencyKey: string,
  ): Promise<PagoExistente | null>;

  /**
   * Verifica que cada asiento esté bloqueado por este usuario y su hold
   * no haya expirado, y devuelve el desglose de precio de cada uno.
   * Lanza si algún asiento no es válido para este checkout.
   */
  validarYCalcularAsientos(
    asientos: PasajeroCheckout[],
    usuarioId: string,
  ): Promise<DesgloseAsiento[]>;

  /** Crea compra + pasajeros_compra + fila de pago en estado 'pendiente'. */
  crearCompraPendiente(
    usuarioId: string,
    pasajeros: PasajeroCheckout[],
    desglose: DesgloseAsiento[],
    idempotencyKey: string,
  ): Promise<{ compraId: string; mapeo: MapeoAsientoPasajero[] }>;

  /**
   * Confirma el pago: marca los asientos como ocupados, crea los
   * boletos con QR y el comprobante de tasa de terminal, y actualiza el
   * pago a 'aprobado'. Agrupa las escrituras por cooperativa
   * internamente (una compra puede, en teoría, involucrar más de una).
   */
  confirmarPago(
    compraId: string,
    referenciaExterna: string,
    mapeo: MapeoAsientoPasajero[],
  ): Promise<{ boletos: BoletoEmitido[] }>;

  /** Registra el rechazo sin tocar los asientos (su hold expira solo). */
  rechazarPago(compraId: string, motivo: string): Promise<void>;
}
