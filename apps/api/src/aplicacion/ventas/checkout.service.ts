import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  CompraRepositorio,
  PasajeroCheckout,
  PasarelaPago,
} from '../../dominio/ventas/ventas.ports';
import { esMenorDeEdad } from '../../dominio/ventas/ventas.ports';
import type { AlmacenamientoArchivos } from '../../dominio/auth/auth.ports';
import { ALMACENAMIENTO_ARCHIVOS } from '../auth/auth.service';
import type { ProveedorFacturacionElectronica } from '../../dominio/facturacion/facturacion.ports';
import { DespachadorWebhooksService } from '../webhooks/despachador-webhooks.service';
import { WalletService } from '../wallet/wallet.service';
import { ReferidosService } from '../referidos/referidos.service';

export const COMPRA_REPOSITORIO = 'COMPRA_REPOSITORIO';
export const PASARELA_PAGO = 'PASARELA_PAGO';
export const PROVEEDOR_FACTURACION = 'PROVEEDOR_FACTURACION';

@Injectable()
export class CheckoutService {
  constructor(
    @Inject(COMPRA_REPOSITORIO) private readonly compras: CompraRepositorio,
    @Inject(PASARELA_PAGO) private readonly pasarela: PasarelaPago,
    @Inject(ALMACENAMIENTO_ARCHIVOS) private readonly almacenamiento: AlmacenamientoArchivos,
    @Inject(PROVEEDOR_FACTURACION) private readonly facturacion: ProveedorFacturacionElectronica,
    private readonly webhooks: DespachadorWebhooksService,
    private readonly wallet: WalletService,
    private readonly referidos: ReferidosService,
  ) {}

  /**
   * RF-CHECK-001 a 005 completo: valida los asientos, calcula el
   * desglose (RN-001, RN-002), crea la compra pendiente, procesa el pago
   * (simulado -- ver infraestructura/pagos/simulador.pasarela.ts), y segun
   * el resultado confirma (genera boletos + QR, RF-TICKET) o rechaza
   * (deja el hold expirar solo, RF-CHECK-004: "sin bloquear el asiento
   * indefinidamente").
   */
  // Item 31, Fase 7 (11-ago-2026) -- compra como invitado. Al menos
  // uno de usuarioId/telefonoContacto/correoContacto debe traer valor
  // (validado abajo).
  async procesarCompra(
    pasajeros: PasajeroCheckout[],
    usuarioId: string | null,
    idempotencyKeyCliente?: string,
    creditoIdAUsar?: string,
    telefonoContacto?: string,
    correoContacto?: string,
    sesionInvitadoId?: string,
    usarSaldoWallet?: boolean,
  ) {
    if (!usuarioId && !telefonoContacto && !correoContacto) {
      throw new BadRequestException(
        'Falta un telefono o correo de contacto -- sin cuenta ni contacto no hay forma de entregar el boleto.',
      );
    }

    // Wallet/cashback Fase 2 (13-ago-2026) -- investigado en los
    // Terminos de Uso reales de ClickBus (seccion 5.7.5.1): el saldo
    // de wallet no es acumulable con otra forma de descuento, el
    // cliente elige una de las 2.
    if (usarSaldoWallet && creditoIdAUsar) {
      throw new BadRequestException(
        'No se puede usar saldo de wallet junto con un crédito de reprogramación en la misma compra -- elige uno.',
      );
    }

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
          `El pasajero "${p.nombres} ${p.apellidos}" es menor de edad -- falta indicar como viaja acompanado (autorizacionMenor).`,
        );
      }
      if (auth.tipoAcompanamiento === 'con_padre_madre_tutor') {
        if (
          auth.adultoAcompananteIndice === undefined ||
          auth.adultoAcompananteIndice === i ||
          !pasajeros[auth.adultoAcompananteIndice]
        ) {
          throw new BadRequestException(
            `El pasajero "${p.nombres} ${p.apellidos}" debe indicar el indice de un adulto acompanante distinto, dentro de la misma compra.`,
          );
        }
        const adulto = pasajeros[auth.adultoAcompananteIndice];
        if (esMenorDeEdad(adulto.tipoTarifa, adulto.fechaNacimiento)) {
          throw new BadRequestException(
            `El acompanante indicado para "${p.nombres} ${p.apellidos}" tambien es menor de edad -- debe ser un adulto.`,
          );
        }
      } else if (auth.tipoAcompanamiento === 'con_autorizacion') {
        if (!auth.adultoResponsableNombre || !auth.adultoResponsableDocumento) {
          throw new BadRequestException(
            `El pasajero "${p.nombres} ${p.apellidos}" viaja con autorizacion -- falta el nombre y documento del adulto responsable.`,
          );
        }
      }
    }

    const desglose = await this.compras.validarYCalcularAsientos(
      pasajeros,
      usuarioId,
      sesionInvitadoId ?? null,
    );
    const montoTotal = desglose.reduce(
      (acc, d) => acc + d.precioPagado + d.tasaTerminal + d.cargoPlataforma,
      0,
    );

    // Consumir un crédito en una compra nueva (29-jul-2026) — cierra el
    // ciclo que quedó a medias el 28-jul: el crédito solo se generaba,
    // nunca se podía gastar. Solo aplica si TODOS los asientos de esta
    // compra son de la misma cooperativa que emitió el crédito — un
    // crédito de la cooperativa A no puede usarse para pagarle a la B.
    let montoAPagar = montoTotal;
    let creditoAplicado = 0;
    if (creditoIdAUsar) {
      // Item 31, Fase 7 (11-ago-2026) -- un credito de reprogramacion
      // pertenece a una cuenta real -- un invitado no puede tener
      // ninguno que gastar.
      if (!usuarioId) {
        throw new BadRequestException(
          'No se puede usar un credito de reprogramacion sin una cuenta.',
        );
      }
      const cooperativasEnCompra = new Set(desglose.map((d) => d.cooperativaId));
      if (cooperativasEnCompra.size !== 1) {
        throw new BadRequestException(
          'No se puede usar un crédito en una compra que mezcla boletos de varias cooperativas.',
        );
      }
      const [cooperativaId] = cooperativasEnCompra;
      const credito = await this.compras.obtenerCreditoParaUsar(
        creditoIdAUsar,
        usuarioId,
        cooperativaId,
      );
      if (!credito) {
        throw new BadRequestException(
          'Este crédito no existe, ya se usó, o no corresponde a la cooperativa de este viaje.',
        );
      }
      creditoAplicado = Math.min(credito.monto, montoTotal);
      montoAPagar = Number((montoTotal - creditoAplicado).toFixed(2));
    }

    // Wallet/cashback Fase 2 (13-ago-2026) -- excluyente con el crédito
    // de arriba (ya validado al inicio del método). Un invitado no
    // tiene wallet -- se ignora en silencio, mismo criterio que ganar
    // cashback (WalletService.acreditarCashbackPorValidacion también
    // simplemente no hace nada para un invitado, sin lanzar error).
    // Decisión reportada: silencioso, no rechazo explícito, porque
    // "usarSaldoWallet: true" en una compra de invitado no es un error
    // del cliente -- el frontend simplemente no debería mostrar esa
    // opción sin sesión, y si igual llega, no tiene sentido bloquear
    // toda la compra por un campo que no aplica.
    let saldoWalletAplicado = 0;
    if (usarSaldoWallet && usuarioId) {
      const saldoDisponible = await this.wallet.saldoDisponible(usuarioId);
      saldoWalletAplicado = Math.min(saldoDisponible, montoTotal);
      montoAPagar = Number((montoTotal - saldoWalletAplicado).toFixed(2));
    }

    // Programa de referidos (13-ago-2026) -- descuento de bienvenida en
    // la PRIMERA compra del referido. Decisión de diseño, investigada y
    // reportada (la orden pedía decidir esto, no asumirlo): se trata
    // como la prioridad más baja de los 3 mecanismos de descuento, no
    // como un cuarto campo que el pasajero elige. Si ya pidió
    // explícitamente crédito de reprogramación o saldo de wallet, esa
    // elección explícita gana y el descuento de referido NO se aplica
    // en esa compra (sigue disponible para la próxima, nunca se marca
    // como consumido si no llegó a usarse). Si no pidió ninguno de los
    // 2, y es su primera compra como referido, se aplica solo -- nunca
    // se rechaza la compra con un 400 por esto, a diferencia de
    // wallet+crédito juntos, porque aquí no hay 2 elecciones explícitas
    // chocando, solo una elección explícita compitiendo con un
    // beneficio automático.
    let descuentoReferidoAplicado = 0;
    let relacionReferidoAAplicar: string | null = null;
    if (!creditoIdAUsar && !usarSaldoWallet && usuarioId) {
      const descuento = await this.referidos.descuentoDisponible(usuarioId);
      if (descuento) {
        descuentoReferidoAplicado = Math.min(descuento.monto, montoTotal);
        montoAPagar = Number((montoTotal - descuentoReferidoAplicado).toFixed(2));
        relacionReferidoAAplicar = descuento.relacionId;
      }
    }

    const { compraId, mapeo } = await this.compras.crearCompraPendiente(
      usuarioId,
      pasajeros,
      desglose,
      idempotencyKey,
      undefined,
      telefonoContacto,
      correoContacto,
    );

    const resultadoPago = await this.pasarela.procesar(
      montoAPagar,
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

    const cargoPlataformaTotal = desglose.reduce((acc, d) => acc + d.cargoPlataforma, 0);
    await this.generarFacturaPlataforma(compraId, cargoPlataformaTotal);

    // El crédito se marca usado DESPUÉS de que el pago se aprueba y el
    // boleto ya existe -- si el pago hubiera fallado, el crédito sigue
    // disponible para intentarlo de nuevo.
    if (creditoIdAUsar && boletos[0]) {
      await this.compras.marcarCreditoUsado(creditoIdAUsar, boletos[0].id);
    }

    // Wallet/cashback Fase 2 (13-ago-2026) -- mismo criterio exacto que
    // el crédito arriba: el débito se registra DESPUÉS de que el pago
    // se aprobó. Si el pago se hubiera rechazado, este bloque nunca se
    // ejecuta (el código ya salió con `return` en el bloque de rechazo,
    // más arriba) -- el saldo del wallet queda intacto.
    if (saldoWalletAplicado > 0 && usuarioId) {
      await this.wallet.debitarPorCompra({
        usuarioId,
        monto: saldoWalletAplicado,
        compraId,
      });
    }

    // Programa de referidos -- mismo criterio exacto que el crédito y
    // el débito de wallet: se marca consumido DESPUÉS de que el pago
    // se aprobó. Si el pago se hubiera rechazado, este bloque nunca se
    // ejecuta -- la relación sigue disponible para un intento futuro.
    if (relacionReferidoAAplicar) {
      await this.referidos.marcarDescuentoConsumido(relacionReferidoAAplicar);
    }

    const montoTotalNotif = mapeo.reduce(
      (acc, m) => acc + m.precioPagado + m.tasaTerminal + m.cargoPlataforma,
      0,
    );
    await this.compras.notificarCompraConfirmada(
      compraId,
      montoTotalNotif,
      boletos.length,
    );

    // Modelo B (02-ago-2026) -- un webhook por cada cooperativa
    // involucrada en esta compra (una compra puede mezclar boletos de
    // varias). Nunca bloquea ni revierte la venta si falla -- mismo
    // criterio que generarFacturaPlataforma, arriba.
    const cooperativasEnVenta = new Set(desglose.map((d) => d.cooperativaId));
    for (const coopId of cooperativasEnVenta) {
      const boletosDeCoop = boletos.filter((_, i) => desglose[i]?.cooperativaId === coopId);
      await this.webhooks.dispararEventoVenta(coopId, compraId, {
        evento: 'venta_creada',
        compraId,
        boletos: boletosDeCoop,
      });
    }

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
      montoPagado: montoAPagar,
      creditoAplicado,
      saldoWalletAplicado,
      descuentoReferidoAplicado,
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

    const politicaReprogramacion = await this.compras.obtenerHorasLimiteReprogramacion(
      viejo.cooperativaId,
    );
    if (!politicaReprogramacion.permitido) {
      throw new BadRequestException(
        'Esta cooperativa no permite reprogramaciones.',
      );
    }
    const horasLimite = politicaReprogramacion.horas;
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
          nombres: viejo.nombres,
          apellidos: viejo.apellidos,
          tipoDocumento: viejo.tipoDocumento,
          documento: viejo.documento,
          tipoTarifa: viejo.tipoTarifa,
          fechaNacimiento: viejo.fechaNacimiento ?? undefined,
        },
      ],
      usuarioId,
      null,
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
          nombres: viejo.nombres,
          apellidos: viejo.apellidos,
          tipoDocumento: viejo.tipoDocumento,
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

  async listarMetodosPagoActivosPorViaje(viajeId: string) {
    return this.compras.listarMetodosPagoActivosPorViaje(viajeId);
  }

  /**
   * Iniciar un pago manual (29-jul-2026) — mientras no hay pasarela
   * real conectada, el pasajero paga por fuera (transferencia,
   * efectivo, DeUna, PayPhone) y sube su comprobante. El asiento queda
   * reservado (no expira solo, a diferencia del bloqueo de tarjeta)
   * hasta que la cooperativa confirme o rechace.
   */
  async iniciarPagoManual(
    pasajeros: PasajeroCheckout[],
    usuarioId: string,
    tipoMetodoPago: string,
    idempotencyKeyCliente?: string,
  ) {
    const desglose = await this.compras.validarYCalcularAsientos(pasajeros, usuarioId, null);

    const cooperativasEnCompra = new Set(desglose.map((d) => d.cooperativaId));
    if (cooperativasEnCompra.size !== 1) {
      throw new BadRequestException(
        'No se puede pagar de forma manual una compra que mezcla boletos de varias cooperativas.',
      );
    }
    const [cooperativaId] = cooperativasEnCompra;

    const metodoActivo = await this.compras.verificarMetodoPagoActivo(
      cooperativaId,
      tipoMetodoPago,
    );
    if (!metodoActivo) {
      throw new BadRequestException(
        'Esta cooperativa no tiene configurado ese método de pago.',
      );
    }

    const idempotencyKey = idempotencyKeyCliente ?? randomUUID();
    const { compraId, mapeo } = await this.compras.crearCompraPendiente(
      usuarioId,
      pasajeros,
      desglose,
      idempotencyKey,
      tipoMetodoPago,
    );

    // El bloqueo temporal corto (minutos) no alcanza para revisar un
    // comprobante -- se convierte en una reserva de largo plazo que no
    // expira sola.
    await this.compras.marcarAsientosPendientesConfirmacionPago(mapeo);

    return { compraId, estado: 'pendiente_confirmacion' as const };
  }

  async subirComprobantePago(
    compraId: string,
    usuarioId: string,
    buffer: Buffer,
    nombreOriginal: string,
  ) {
    const { url } = await this.almacenamiento.guardarImagen(
      buffer,
      nombreOriginal,
      'comprobantes-pago',
    );
    const resultado = await this.compras.adjuntarComprobante(compraId, usuarioId, url);
    if (!resultado.ok) {
      throw new BadRequestException(resultado.motivo);
    }
    return { ok: true, comprobanteUrl: url };
  }

  /**
   * Lado cooperativa del pago manual (29-jul-2026): ve los pagos con
   * comprobante subido, esperando confirmación.
   */
  async listarPagosPendientesConfirmacion(cooperativaId: string) {
    return this.compras.listarPagosPendientesConfirmacion(cooperativaId);
  }

  async confirmarPagoManual(
    pagoId: string,
    cooperativaId: string,
    confirmadoPorUsuarioId: string,
  ) {
    const resultado = await this.compras.confirmarPagoManual(
      pagoId,
      cooperativaId,
      confirmadoPorUsuarioId,
    );
    if (!resultado.ok) {
      throw new BadRequestException(resultado.motivo);
    }
    // Factura del servicio de Colombus (29-jul-2026) -- no falla la
    // confirmación del pago si esto tiene algún problema, el boleto ya
    // es real y válido de todas formas; se registra el error para
    // revisión (ver comprobante_electronico.estado='rechazado').
    await this.generarFacturaPlataforma(resultado.compraId, resultado.montoCargoPlataforma);

    // Modelo B (02-ago-2026) -- mismo disparo que en procesarCompra,
    // pero acá ya sabemos que es una sola cooperativa (el parámetro).
    await this.webhooks.dispararEventoVenta(cooperativaId, resultado.compraId, {
      evento: 'venta_creada',
      compraId: resultado.compraId,
    });

    return { ok: true };
  }

  /** Factura del servicio de Colombus (29-jul-2026) -- ver dominio/facturacion/facturacion.ports.ts. */
  private async generarFacturaPlataforma(compraId: string, montoCargoPlataforma: number) {
    if (montoCargoPlataforma <= 0) return;
    try {
      const { ruc } = await this.compras.obtenerDatosFiscalesPlataforma();
      const resultadoFactura = await this.facturacion.emitirComprobante({
        montoTotal: montoCargoPlataforma,
        descripcion: 'Cargo por servicio de plataforma Columbus',
      });
      await this.compras.crearComprobantePlataforma(
        compraId,
        montoCargoPlataforma,
        ruc,
        resultadoFactura,
      );
    } catch {
      // Silencioso a propósito: la factura del servicio de Colombus no
      // debe bloquear ni revertir una venta ya confirmada.
    }
  }

  async rechazarPagoManual(
    pagoId: string,
    cooperativaId: string,
    motivo: string | undefined,
    confirmadoPorUsuarioId: string,
  ) {
    const resultado = await this.compras.rechazarPagoManual(
      pagoId,
      cooperativaId,
      motivo,
      confirmadoPorUsuarioId,
    );
    if (!resultado.ok) {
      throw new BadRequestException(resultado.motivo);
    }
    return { ok: true };
  }

  /**
   * Solicitud de factura del pasaje (29-jul-2026) -- confirmado con el
   * usuario: la cooperativa emite en su propio sistema, Colombus solo
   * avisa.
   */
  async solicitarFacturaCooperativa(
    boletoId: string,
    usuarioId: string,
    datosTributarios: Record<string, string>,
  ) {
    const resultado = await this.compras.solicitarFacturaCooperativa(
      boletoId,
      usuarioId,
      datosTributarios,
    );
    if (!resultado.ok) {
      throw new BadRequestException(resultado.motivo);
    }
    return { ok: true, id: resultado.id };
  }

  async listarSolicitudesFactura(cooperativaId: string) {
    return this.compras.listarSolicitudesFactura(cooperativaId);
  }

  async marcarFacturaEmitida(solicitudId: string, cooperativaId: string, urlFactura?: string) {
    const resultado = await this.compras.marcarFacturaEmitida(
      solicitudId,
      cooperativaId,
      urlFactura,
    );
    if (!resultado.ok) {
      throw new BadRequestException(resultado.motivo);
    }
    return { ok: true };
  }
}
