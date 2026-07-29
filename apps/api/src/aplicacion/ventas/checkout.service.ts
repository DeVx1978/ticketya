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
   * (simulado -- ver infraestructura/pagos/simulador.pasarela.ts), y segun
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

    // RF-CHECK-005 -- si esta misma clave ya se proceso antes (reintento
    // de red del cliente), se devuelve el resultado original en vez de
    // volver a cobrar.
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

    // RF-MENOR -- se valida ANTES de bloquear asientos o cobrar nada
    // (fail fast), no despues.
    for (let i = 0; i < pasajeros.length; i++) {
      const p = pasajeros[i];
      if (!esMenorDeEdad(p.tipoTarifa, p.fechaNacimiento)) continue;

      const auth = p.autorizacionMenor;
      if (!auth) {
        throw new BadRequestException(
          `El pasajero "${p.nombreCompleto}" es menor de edad -- falta indicar como viaja acompanado (autorizacionMenor).`,
        );
      }
      if (auth.tipoAcompanamiento === 'con_padre_madre_tutor') {
        if (
          auth.adultoAcompananteIndice === undefined ||
          auth.adultoAcompananteIndice === i ||
          !pasajeros[auth.adultoAcompananteIndice]
        ) {
          throw new BadRequestException(
            `El pasajero "${p.nombreCompleto}" debe indicar el indice de un adulto acompanante distinto, dentro de la misma compra.`,
          );
        }
        const adulto = pasajeros[auth.adultoAcompananteIndice];
        if (esMenorDeEdad(adulto.tipoTarifa, adulto.fechaNacimiento)) {
          throw new BadRequestException(
            `El acompanante indicado para "${p.nombreCompleto}" tambien es menor de edad -- debe ser un adulto.`,
          );
        }
      } else if (auth.tipoAcompanamiento === 'con_autorizacion') {
        if (!auth.adultoResponsableNombre || !auth.adultoResponsableDocumento) {
          throw new BadRequestException(
            `El pasajero "${p.nombreCompleto}" viaja con autorizacion -- falta el nombre y documento del adulto responsable.`,
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

    const montoTotalNotif = mapeo.reduce(
      (acc, m) => acc + m.precioPagado + m.tasaTerminal + m.cargoPlataforma,
      0,
    );
    await this.compras.notificarCompraConfirmada(
      compraId,
      montoTotalNotif,
      boletos.length,
    );

    const ivaTotal = desglose.reduce((acc, d) => acc + d.ivaMonto, 0);
    // Si la compra mezcla boletos de cooperativas con distinta
    // configuracion de visibilidad, se prefiere mostrarlo (mas
    // transparente) en vez de ocultarlo por defecto.
    let ivaVisible = desglose.some((d) => d.ivaVisible);

    // 27-jul-2026 -- el valor REAL ya quedo calculado y persistido en
    // boletos.ivaMonto (dentro de confirmarPago, arriba). Esto solo
    // transforma lo que se le devuelve al pasajero en la respuesta,
    // segun el modo configurado desde el Panel Admin -- Colombus no
    // debe afirmar un IVA sobre la tarifa que no le corresponde
    // declarar legalmente (cada cooperativa maneja su propia relacion
    // con el SRI, de forma independiente).
    const modoIva = await this.compras.obtenerModoIvaBoleto();
    let ivaTotalRespuesta = Number(ivaTotal.toFixed(2));
    let boletosRespuesta = boletos;

    if (modoIva === 'cero') {
      ivaTotalRespuesta = 0;
      boletosRespuesta = boletos.map((b) => ({ ...b, ivaMonto: 0 }));
    } else if (modoIva === 'oculto') {
      ivaVisible = false;
    }

    return {
      compraId,
      estado: 'aprobado' as const,
      boletos: boletosRespuesta,
      montoTotal,
      ivaTotal: ivaTotalRespuesta,
      ivaVisible,
    };
  }

  async cancelarBoleto(boletoId: string, usuarioId: string) {
    return this.compras.cancelarBoleto(boletoId, usuarioId);
  }

  /**
   * Reprogramación con crédito (Fase C, 29-jul-2026). Reutiliza la
   * validación/reserva de asientos y el pago simulado del checkout
   * normal — no reinventa esa lógica.
   *
   * Reglas (confirmadas con el usuario, validadas contra el estándar
   * de la industria — Flixbus, Peter Pan, OurBus):
   *  - Solo dentro de la misma cooperativa.
   *  - Respeta el límite de horas antes de la salida que cada
   *    cooperativa configura (RN, 28-jul-2026).
   *  - La plataforma NO vuelve a cobrar su cargo fijo.
   *  - Si el nuevo pasaje es más barato: el excedente queda como
   *    crédito interno (no efectivo — no hay pasarela real todavía).
   *  - Si es más caro: el pasajero paga la diferencia con el mismo
   *    flujo de pago simulado del checkout.
   *
   * El asiento nuevo debe estar bloqueado a nombre de este usuario
   * ANTES de llamar esto (mismo flujo que un checkout normal:
   * bloquear-asiento primero).
   */
  async reprogramarBoleto(
    boletoIdViejo: string,
    nuevoViajeId: string,
    nuevoNumeroAsiento: string,
    usuarioId: string,
  ) {
    const viejo = await this.compras.obtenerDetalleBoletoParaReprogramar(
      boletoIdViejo,
      usuarioId,
    );
    if (!viejo) {
      throw new BadRequestException('Este boleto no existe o no te pertenece.');
    }
    if (viejo.estado !== 'vigente') {
      throw new BadRequestException(
        viejo.estado === 'usado'
          ? 'Este boleto ya fue usado, no se puede reprogramar.'
          : 'Este boleto ya estaba cancelado.',
      );
    }

    const horasLimite = await this.compras.obtenerHorasLimiteReprogramacion(
      viejo.cooperativaId,
    );
    const limite = new Date(viejo.horaSalidaProgramada);
    limite.setHours(limite.getHours() - horasLimite);
    if (new Date() > limite) {
      throw new BadRequestException(
        `Ya no se puede reprogramar — faltan menos de ${horasLimite} horas para la salida original.`,
      );
    }

    // Validar y calcular el asiento NUEVO — reutiliza exactamente la
    // misma verificación de checkout (el asiento debe estar bloqueado
    // a nombre de este usuario).
    const [desgloseNuevo] = await this.compras.validarYCalcularAsientos(
      [
        {
          viajeId: nuevoViajeId,
          numeroAsiento: nuevoNumeroAsiento,
          nombreCompleto: viejo.nombreCompleto,
          documento: viejo.documento,
          tipoTarifa: viejo.tipoTarifa,
          fechaNacimiento: viejo.fechaNacimiento ?? undefined,
        },
      ],
      usuarioId,
    );

    if (desgloseNuevo.cooperativaId !== viejo.cooperativaId) {
      throw new BadRequestException(
        'Solo puedes reprogramar dentro de la misma cooperativa.',
      );
    }

    // La plataforma no vuelve a cobrar su cargo fijo en una
    // reprogramación — es el mismo pasajero, no una venta nueva.
    desgloseNuevo.cargoPlataforma = 0;

    const totalNuevo = desgloseNuevo.precioPagado + desgloseNuevo.tasaTerminal;
    const totalViejo = viejo.precioPagado + viejo.tasaTerminal;
    const diferencia = Number((totalNuevo - totalViejo).toFixed(2));

    // Si el pasaje nuevo es más caro, se cobra la diferencia ANTES de
    // tocar el boleto viejo — si el pago falla, el pasajero no pierde
    // su boleto original.
    if (diferencia > 0) {
      const idempotencyKey = randomUUID();
      const resultadoPago = await this.pasarela.procesar(
        diferencia,
        idempotencyKey,
      );
      if (!resultadoPago.aprobado) {
        throw new BadRequestException(
          resultadoPago.motivoRechazo ??
            'No se pudo cobrar la diferencia — inténtalo de nuevo.',
        );
      }
    }

    const { compraId, mapeo } = await this.compras.crearCompraPendiente(
      usuarioId,
      [
        {
          viajeId: nuevoViajeId,
          numeroAsiento: nuevoNumeroAsiento,
          nombreCompleto: viejo.nombreCompleto,
          documento: viejo.documento,
          tipoTarifa: viejo.tipoTarifa,
          fechaNacimiento: viejo.fechaNacimiento ?? undefined,
        },
      ],
      [desgloseNuevo],
      randomUUID(),
    );
    const { boletos } = await this.compras.confirmarPago(
      compraId,
      `reprogramacion-${boletoIdViejo}`,
      mapeo,
    );

    await this.compras.cancelarBoletoPorReprogramacion(
      boletoIdViejo,
      viejo.viajeAsientoId,
    );

    let credito: number | null = null;
    if (diferencia < 0) {
      credito = Number((-diferencia).toFixed(2));
      await this.compras.crearCreditoPasajero(
        usuarioId,
        viejo.cooperativaId,
        credito,
        boletoIdViejo,
      );
    }

    return {
      boletoNuevo: boletos[0],
      diferenciaPagada: diferencia > 0 ? diferencia : 0,
      creditoGenerado: credito,
    };
  }

  async obtenerReciboCompra(compraId: string, usuarioId: string) {
    return this.compras.obtenerReciboCompra(compraId, usuarioId);
  }

  /** Vacío real de diseño encontrado el 29-jul-2026: sin esto, el pasajero no tenía dónde ver su saldo de crédito. */
  async listarMisCreditos(usuarioId: string) {
    return this.compras.listarCreditosUsuario(usuarioId);
  }
}
