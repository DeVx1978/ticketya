import { Inject, Injectable, Logger } from '@nestjs/common';
import type { WalletRepositorio } from '../../dominio/wallet/wallet.ports';

export const WALLET_REPOSITORIO = 'WALLET_REPOSITORIO';

/** Mismo plazo real que ClickBus (CashBus), decisión del director. */
const DIAS_VIGENCIA_CASHBACK = 180;

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @Inject(WALLET_REPOSITORIO)
    private readonly wallet: WalletRepositorio,
  ) {}

  /**
   * Disparado desde PanelEmpresaService.validarBoletoPorQr, justo
   * después de que el boleto ya pasó a 'usado' de verdad -- nunca
   * antes. Solo si el comprador tiene cuenta real (compradorUsuarioId
   * no nulo); un invitado no participa, mismo criterio que ClickBus.
   *
   * Nunca lanza -- un fallo al acreditar cashback no debe revertir ni
   * bloquear la validación del boleto en el andén, que ya ocurrió de
   * verdad (mismo criterio que notificarCompraConfirmada y el
   * despachador de webhooks: la acción principal ya es irreversible,
   * un efecto secundario que falla se registra, no se propaga).
   *
   * Idempotencia real: no se necesita ningún control explícito aquí
   * porque el propio UPDATE de validarBoletoPorQr ya usa
   * `WHERE estado = 'vigente'` -- un boleto no puede pasar a 'usado'
   * dos veces, así que este método tampoco puede ejecutarse dos veces
   * para el mismo boleto en el flujo normal.
   */
  async acreditarCashbackPorValidacion(datos: {
    compradorUsuarioId: string | null;
    compraId: string;
    precioPagado: number;
  }): Promise<void> {
    if (!datos.compradorUsuarioId) return; // invitado -- no participa, mismo criterio que ClickBus

    try {
      const porcentaje = await this.wallet.obtenerCashbackPorcentajeDefault();
      if (!porcentaje || porcentaje <= 0) return; // 0% por defecto hasta que el director decida el número real

      const monto = Math.round(((datos.precioPagado * porcentaje) / 100) * 100) / 100;
      if (monto <= 0) return;

      await this.wallet.crearMovimientoCredito({
        usuarioId: datos.compradorUsuarioId,
        monto,
        tipo: 'credito_cashback',
        compraId: datos.compraId,
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`No se pudo acreditar cashback de la compra ${datos.compraId}: ${mensaje}`);
    }
  }

  async saldo(usuarioId: string): Promise<{ saldo: number }> {
    const saldo = await this.wallet.saldoDeUsuario(usuarioId, DIAS_VIGENCIA_CASHBACK);
    return { saldo };
  }

  async obtenerCashbackPorcentajeDefault(): Promise<number> {
    return (await this.wallet.obtenerCashbackPorcentajeDefault()) ?? 0;
  }

  async actualizarCashbackPorcentajeDefault(porcentaje: number, usuarioId: string): Promise<void> {
    await this.wallet.actualizarCashbackPorcentajeDefault(porcentaje, usuarioId);
  }
}
