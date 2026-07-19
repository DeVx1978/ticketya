import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { CompraRepositorio, PasajeroCheckout, PasarelaPago } from '../../dominio/ventas/ventas.ports';

export const COMPRA_REPOSITORIO = 'COMPRA_REPOSITORIO';
export const PASARELA_PAGO = 'PASARELA_PAGO';

@Injectable()
export class CheckoutService {
  constructor(
    @Inject(COMPRA_REPOSITORIO) private readonly compras: CompraRepositorio,
    @Inject(PASARELA_PAGO) private readonly pasarela: PasarelaPago,
  ) {}

  /**
   * RF-CHECK-001 a 005 completo: valida los asientos, calcula el
   * desglose (RN-001, RN-002), crea la compra pendiente, procesa el pago
   * (simulado — ver infraestructura/pagos/simulador.pasarela.ts), y según
   * el resultado confirma (genera boletos + QR, RF-TICKET) o rechaza
   * (deja el hold expirar solo, RF-CHECK-004: "sin bloquear el asiento
   * indefinidamente").
   */
  async procesarCompra(pasajeros: PasajeroCheckout[], usuarioId: string, idempotencyKeyCliente?: string) {
    const idempotencyKey = idempotencyKeyCliente ?? randomUUID();

    // RF-CHECK-005 — si esta misma clave ya se procesó antes (reintento
    // de red del cliente), se devuelve el resultado original en vez de
    // volver a cobrar. Esto es lo que hace que un doble clic o un
    // reintento automático del navegador no genere un cargo duplicado.
    const existente = await this.compras.buscarPagoPorIdempotencyKey(idempotencyKey);
    if (existente) {
      return {
        compraId: existente.compraId,
        estado: existente.estado === 'aprobado' ? ('aprobado' as const) : ('rechazado' as const),
        boletoIds: existente.boletoIds,
        reintento: true,
      };
    }

    const desglose = await this.compras.validarYCalcularAsientos(pasajeros, usuarioId);
    const montoTotal = desglose.reduce((acc, d) => acc + d.precioPagado + d.tasaTerminal + d.cargoPlataforma, 0);

    const { compraId, mapeo } = await this.compras.crearCompraPendiente(usuarioId, pasajeros, desglose, idempotencyKey);

    const resultadoPago = await this.pasarela.procesar(montoTotal, idempotencyKey);

    if (!resultadoPago.aprobado) {
      await this.compras.rechazarPago(compraId, resultadoPago.motivoRechazo ?? 'Pago rechazado');
      return {
        compraId,
        estado: 'rechazado' as const,
        motivo: resultadoPago.motivoRechazo ?? 'El pago fue rechazado.',
      };
    }

    const { boletoIds } = await this.compras.confirmarPago(compraId, resultadoPago.referenciaExterna, mapeo);
    return { compraId, estado: 'aprobado' as const, boletoIds, montoTotal };
  }
}
