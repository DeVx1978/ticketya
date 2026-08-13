/**
 * Wallet / cashback -- Fase 1 (13-ago-2026): ganar y consultar saldo.
 * Fase 2 (13-ago-2026): gastar el saldo en una compra. Ver comentario
 * de diseño completo en packages/db/schema/wallet.ts sobre por qué es
 * un historial de movimientos y no un solo saldo acumulado, y por qué
 * no tiene política RLS.
 */
export interface WalletRepositorio {
  /**
   * Crea un movimiento -- crédito o débito, según `tipo`. Ya era
   * genérico desde la Fase 1 (el parámetro `tipo` siempre fue libre),
   * pero se renombra de `crearMovimientoCredito` a `crearMovimiento`
   * en la Fase 2 para que el nombre no mienta ahora que también se usa
   * para 'debito_compra' -- no cambia ningún comportamiento, solo el
   * nombre.
   */
  crearMovimiento(datos: {
    usuarioId: string;
    monto: number;
    tipo: string;
    compraId: string;
  }): Promise<{ id: string }>;

  /**
   * Saldo real, Fase 2 -- ahora resta los débitos (gastos de wallet en
   * una compra), no solo suma créditos. Los créditos siguen expirando
   * a los `diasVigencia` días (180, ClickBus, calculado directo en la
   * consulta); los débitos NUNCA expiran -- un débito representa saldo
   * ya gastado de verdad, no debe "volver a aparecer" solo porque pasó
   * tiempo.
   */
  saldoDeUsuario(usuarioId: string, diasVigencia: number): Promise<number>;

  /** Configuración global -- mismo patrón que cargoPlataformaPorPasajeroDefault. */
  obtenerCashbackPorcentajeDefault(): Promise<number | null>;
  actualizarCashbackPorcentajeDefault(
    porcentaje: number,
    actualizadoPorUsuarioId: string,
  ): Promise<void>;
}
