/**
 * Wallet / cashback, Fase 1 (13-ago-2026) -- ganar y consultar saldo.
 * Ver comentario de diseño completo en packages/db/schema/wallet.ts
 * sobre por qué es un historial de movimientos y no un solo saldo
 * acumulado, y por qué no tiene política RLS.
 *
 * Fuera de alcance en esta fase, a propósito: gastar el saldo en una
 * compra nueva (Fase 2) -- este puerto solo cubre ganar y consultar.
 */
export interface WalletRepositorio {
  /**
   * Crea el movimiento de crédito. No valida aquí si el usuario tiene
   * cuenta real (compradorUsuarioId no nulo) -- esa decisión vive en la
   * capa de aplicación, antes de siquiera llamar a este método.
   */
  crearMovimientoCredito(datos: {
    usuarioId: string;
    monto: number;
    tipo: string;
    compraId: string;
  }): Promise<{ id: string }>;

  /**
   * Saldo real = suma de movimientos de crédito de los últimos 180
   * días, calculado directo en la consulta (sin cron de expiración
   * necesario) -- un movimiento con más de 180 días simplemente deja
   * de sumar, nunca se borra ni se marca como "expirado" explícitamente
   * en esta fase.
   */
  saldoDeUsuario(usuarioId: string, diasVigencia: number): Promise<number>;

  /** Configuración global -- mismo patrón que cargoPlataformaPorPasajeroDefault. */
  obtenerCashbackPorcentajeDefault(): Promise<number | null>;
  actualizarCashbackPorcentajeDefault(
    porcentaje: number,
    actualizadoPorUsuarioId: string,
  ): Promise<void>;
}
