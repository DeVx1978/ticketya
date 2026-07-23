import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  CompraRepositorio,
  PasajeroCheckout,
  PasarelaPago,
} from '../../dominio/ventas/ventas.ports';
import { esMenorDeEdad } from '../../dominio/ventas/ventas.ports';

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
  async procesarCompra(
    pasajeros: PasajeroCheckout[],
    usuarioId: string,
    idempotencyKeyCliente?: string,
  ) {
    const idempotencyKey = idempotencyKeyCliente ?? randomUUID();

    // RF-CHECK-005 — si esta misma clave ya se procesó antes (reintento
    // de red del cliente), se devuelve el resultado original en vez de
    // volver a cobrar. Esto es lo que hace que un doble clic o un
    // reintento automático del navegador no genere un cargo duplicado.
    const existente =
      await this.compras.buscarPagoPorIdempotencyKey(idempotencyKey);
    if (existente) {
      return {
        compraId: existente.compraId,
        estado:
          existente.estado === 'aprobado'
            ? ('aprobado' as const)
            : ('rechazado' as const),
        boletos: existente.boletos,
        reintento: true,
      };
    }

    // RF-MENOR — hallazgo real, 22-jul-2026: las tablas de autorización
    // de menores existían en el esquema desde el diseño original, pero
    // nunca se exigía nada al comprar — un pasajero con tarifa 'nino'
    // pasaba sin ningún control. Se valida ANTES de bloquear asientos o
    // cobrar nada (fail fast), no después.
    for (let i = 0; i < pasajeros.length; i++) {
      const p = pasajeros[i];
      if (!esMenorDeEdad(p.tipoTarifa, p.fechaNacimiento)) continue;

      const auth = p.autorizacionMenor;
      if (!auth) {
        throw new BadRequestException(
          `El pasajero "${p.nombreCompleto}" es menor de edad — falta indicar cómo viaja acompañado (autorizacionMenor).`,
        );
      }
      if (auth.tipoAcompanamiento === 'con_padre_madre_tutor') {
        if (
          auth.adultoAcompananteIndice === undefined ||
          auth.adultoAcompananteIndice === i ||
          !pasajeros[auth.adultoAcompananteIndice]
        ) {
          throw new BadRequestException(
            `El pasajero "${p.nombreCompleto}" debe indicar el índice de un adulto acompañante distinto, dentro de la misma compra.`,
          );
        }
        const adulto = pasajeros[auth.adultoAcompananteIndice];
        if (esMenorDeEdad(adulto.tipoTarifa, adulto.fechaNacimiento)) {
          throw new BadRequestException(
            `El acompañante indicado para "${p.nombreCompleto}" también es menor de edad — debe ser un adulto.`,
          );
        }
      } else if (auth.tipoAcompanamiento === 'con_autorizacion') {
        if (!auth.adultoResponsableNombre || !auth.adultoResponsableDocumento) {
          throw new BadRequestException(
            `El pasajero "${p.nombreCompleto}" viaja con autorización — falta el nombre y documento del adulto responsable.`,
          );
        }
      }
    }

    const desglose = await this.compras.validarYCalcularAsientos(
      pasajeros,
      usuarioId,
    );
    const montoTotal = desglose.reduce(
      (acc, d) => acc + d.precioPagado + d.tasaTerminal + d.cargoPlataforma,
      0,
    );

    const { compraId, mapeo } = await this.compras.crearCompraPendiente(
      usuarioId,
      pasajeros,
      desglose,
      idempotencyKey,
    );

    const resultadoPago = await this.pasarela.procesar(
      montoTotal,
      idempotencyKey,
    );

    if (!resultadoPago.aprobado) {
      await this.compras.rechazarPago(
        compraId,
        resultadoPago.motivoRechazo ?? 'Pago rechazado',
      );
      return {
        compraId,
        estado: 'rechazado' as const,
        motivo: resultadoPago.motivoRechazo ?? 'El pago fue rechazado.',
      };
    }

    const { boletos } = await this.compras.confirmarPago(
      compraId,
      resultadoPago.referenciaExterna,
      mapeo,
    );
    const ivaTotal = desglose.reduce((acc, d) => acc + d.ivaMonto, 0);
    // Si la compra mezcla boletos de cooperativas con distinta
    // configuración de visibilidad, se prefiere mostrarlo (más
    // transparente) en vez de ocultarlo por defecto.
    const ivaVisible = desglose.some((d) => d.ivaVisible);
    return {
      compraId,
      estado: 'aprobado' as const,
      boletos,
      montoTotal,
      ivaTotal: Number(ivaTotal.toFixed(2)),
      ivaVisible,
    };
  }
}
