import { Inject, Injectable, BadRequestException, Logger } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { NotificadorEmail } from '../../dominio/auth/auth.ports';
import { NOTIFICADOR_EMAIL } from '../../aplicacion/auth/auth.service';
import { randomUUID } from 'node:crypto';
import {
  viajes,
  viajeAsientos,
  rutas,
  puntosOperacion,
  cooperativas,
  compras,
  pasajerosCompra,
  pagos,
  boletos,
  comprobantesTasaTerminal,
  autorizacionesMenor,
  configuracionPlataforma,
  notificaciones,
  creditosPasajero,
} from '@ticketya/db';
import { DRIZZLE_DB_PUBLICO, DRIZZLE_DB } from '../database/database.module';
import type { DrizzleDb } from '../database/database.provider';
import { ejecutarComoCooperativa } from '../database/tenant-transaction';
import type {
  CompraRepositorio,
  PasajeroCheckout,
  DesgloseAsiento,
  MapeoAsientoPasajero,
  PagoExistente,
  BoletoEmitido,
  ReciboCompra,
} from '../../dominio/ventas/ventas.ports';
import {
  factorDescuento,
  esMenorDeEdad,
} from '../../dominio/ventas/ventas.ports';

@Injectable()
export class CompraRepositorioDrizzle implements CompraRepositorio {
  private readonly logger = new Logger(CompraRepositorioDrizzle.name);

  constructor(
    @Inject(DRIZZLE_DB_PUBLICO) private readonly dbPublico: DrizzleDb,
    @Inject(DRIZZLE_DB) private readonly dbApp: DrizzleDb,
    @Inject(NOTIFICADOR_EMAIL) private readonly email: NotificadorEmail,
  ) {}

  async buscarPagoPorIdempotencyKey(
    idempotencyKey: string,
  ): Promise<PagoExistente | null> {
    const pago = await this.dbPublico.query.pagos.findFirst({
      where: eq(pagos.idempotencyKey, idempotencyKey),
    });
    if (!pago) return null;

    const boletosDeLaCompra = await this.dbPublico
      .select({
        id: boletos.id,
        codigoQr: boletos.codigoQr,
        numeroAsiento: viajeAsientos.numeroAsiento,
        precioPagado: boletos.precioPagado,
        cargoPlataforma: boletos.cargoPlataforma,
        ivaMonto: boletos.ivaMonto,
        tasaTerminal: comprobantesTasaTerminal.monto,
      })
      .from(boletos)
      .innerJoin(viajeAsientos, eq(boletos.viajeAsientoId, viajeAsientos.id))
      .leftJoin(
        comprobantesTasaTerminal,
        eq(comprobantesTasaTerminal.boletoId, boletos.id),
      )
      .where(eq(boletos.compraId, pago.compraId));

    return {
      compraId: pago.compraId,
      estado: pago.estado,
      boletos: boletosDeLaCompra.map((b) => ({
        id: b.id,
        codigoQr: b.codigoQr,
        numeroAsiento: b.numeroAsiento,
        precioPagado: Number(b.precioPagado),
        cargoPlataforma: Number(b.cargoPlataforma),
        ivaMonto: Number(b.ivaMonto),
        tasaTerminal: Number(b.tasaTerminal ?? 0),
      })),
    };
  }

  async validarYCalcularAsientos(
    asientos: PasajeroCheckout[],
    usuarioId: string,
  ): Promise<DesgloseAsiento[]> {
    const configuracion =
      await this.dbPublico.query.configuracionPlataforma.findFirst();
    const cargoPlataforma = Number(
      configuracion?.cargoPlataformaPorPasajeroDefault ?? 0,
    );

    const resultado: DesgloseAsiento[] = [];

    for (const asiento of asientos) {
      const fila = await this.dbPublico
        .select({
          cooperativaId: viajes.cooperativaId,
          precioBase: viajes.precioBase,
          estadoAsiento: viajeAsientos.estado,
          holdUsuarioId: viajeAsientos.holdUsuarioId,
          holdExpiraEn: viajeAsientos.holdExpiraEn,
          tasaTerminal: puntosOperacion.tasaMonto,
          ivaPorcentaje: cooperativas.ivaPorcentaje,
          ivaVisibleEnBoleto: cooperativas.ivaVisibleEnBoleto,
        })
        .from(viajeAsientos)
        .innerJoin(viajes, eq(viajeAsientos.viajeId, viajes.id))
        .innerJoin(rutas, eq(viajes.rutaId, rutas.id))
        .innerJoin(
          puntosOperacion,
          eq(rutas.origenPuntoOperacionId, puntosOperacion.id),
        )
        .innerJoin(cooperativas, eq(viajes.cooperativaId, cooperativas.id))
        .where(
          and(
            eq(viajeAsientos.viajeId, asiento.viajeId),
            eq(viajeAsientos.numeroAsiento, asiento.numeroAsiento),
          ),
        )
        .limit(1);

      if (fila.length === 0) {
        throw new BadRequestException(
          `El asiento ${asiento.numeroAsiento} no está bloqueado — selecciónalo primero.`,
        );
      }

      const f = fila[0];
      const holdVigente =
        f.holdExpiraEn && new Date(f.holdExpiraEn).getTime() > Date.now();

      if (
        f.estadoAsiento !== 'bloqueado_temporal' ||
        f.holdUsuarioId !== usuarioId ||
        !holdVigente
      ) {
        throw new BadRequestException(
          `El bloqueo del asiento ${asiento.numeroAsiento} ya no es válido (expiró o pertenece a otro usuario) — vuelve a seleccionarlo.`,
        );
      }

      const precioPagado =
        Number(f.precioBase) * factorDescuento(asiento.tipoTarifa);
      const ivaPorcentaje = Number(f.ivaPorcentaje ?? 0);
      // El precio YA trae el IVA incluido — se despeja la porción de IVA
      // sobre el total, no se suma aparte. Ej.: precio 11.50, IVA 15% →
      // base = 11.50 / 1.15 = 10, iva = 11.50 - 10 = 1.50.
      const ivaMonto =
        ivaPorcentaje > 0
          ? precioPagado - precioPagado / (1 + ivaPorcentaje / 100)
          : 0;

      resultado.push({
        viajeId: asiento.viajeId,
        numeroAsiento: asiento.numeroAsiento,
        cooperativaId: f.cooperativaId,
        precioPagado,
        tasaTerminal: Number(f.tasaTerminal ?? 0),
        cargoPlataforma,
        ivaMonto: Number(ivaMonto.toFixed(2)),
        ivaVisible: f.ivaVisibleEnBoleto,
      });
    }

    return resultado;
  }

  async crearCompraPendiente(
    usuarioId: string,
    pasajeros: PasajeroCheckout[],
    desglose: DesgloseAsiento[],
    idempotencyKey: string,
  ): Promise<{ compraId: string; mapeo: MapeoAsientoPasajero[] }> {
    const montoTarifasCooperativa = desglose.reduce(
      (a, d) => a + d.precioPagado,
      0,
    );
    const montoTasaTerminal = desglose.reduce((a, d) => a + d.tasaTerminal, 0);
    const montoCargoPlataforma = desglose.reduce(
      (a, d) => a + d.cargoPlataforma,
      0,
    );
    // El IVA ya viene incluido dentro de montoTarifasCooperativa (no se
    // suma aparte al total) — esta columna es el desglose informativo de
    // cuánto de ese monto corresponde a IVA, para el comprobante y la
    // auditoría (RN-002).
    const montoImpuestos = desglose.reduce((a, d) => a + d.ivaMonto, 0);
    const montoTotal =
      montoTarifasCooperativa + montoTasaTerminal + montoCargoPlataforma;

    const [compra] = await this.dbPublico
      .insert(compras)
      .values({
        compradorUsuarioId: usuarioId,
        canal: 'en_linea',
        montoTotal: montoTotal.toFixed(2),
        montoTarifasCooperativa: montoTarifasCooperativa.toFixed(2),
        montoCargoPlataforma: montoCargoPlataforma.toFixed(2),
        montoTasaTerminal: montoTasaTerminal.toFixed(2),
        montoImpuestos: montoImpuestos.toFixed(2),
      })
      .returning();

    const mapeo: MapeoAsientoPasajero[] = [];
    const pasajeroCompraIds: string[] = [];

    for (let i = 0; i < pasajeros.length; i++) {
      const p = pasajeros[i];
      const d = desglose[i];
      const [pasajeroCompra] = await this.dbPublico
        .insert(pasajerosCompra)
        .values({
          compraId: compra.id,
          nombreCompleto: p.nombreCompleto,
          documento: p.documento,
          tipoTarifa: p.tipoTarifa,
          fechaNacimiento: p.fechaNacimiento,
          esMenorEdad: esMenorDeEdad(p.tipoTarifa, p.fechaNacimiento),
        })
        .returning();
      pasajeroCompraIds.push(pasajeroCompra.id);

      mapeo.push({
        viajeId: p.viajeId,
        numeroAsiento: p.numeroAsiento,
        pasajeroCompraId: pasajeroCompra.id,
        cooperativaId: d.cooperativaId,
        precioPagado: d.precioPagado,
        tasaTerminal: d.tasaTerminal,
        cargoPlataforma: d.cargoPlataforma,
        ivaMonto: d.ivaMonto,
      });
    }

    // RF-MENOR — segunda pasada, ya con todos los pasajeroCompra.id
    // conocidos: recién aquí se puede resolver la referencia al adulto
    // acompañante (es otro pasajero DENTRO de esta misma compra).
    for (let i = 0; i < pasajeros.length; i++) {
      const auth = pasajeros[i].autorizacionMenor;
      if (!auth) continue;
      await this.dbPublico.insert(autorizacionesMenor).values({
        pasajeroCompraId: pasajeroCompraIds[i],
        tipoAcompanamiento: auth.tipoAcompanamiento,
        adultoAcompananteEnCompraId:
          auth.adultoAcompananteIndice !== undefined
            ? pasajeroCompraIds[auth.adultoAcompananteIndice]
            : undefined,
        adultoResponsableNombre: auth.adultoResponsableNombre,
        adultoResponsableDocumento: auth.adultoResponsableDocumento,
        adultoResponsableTelefono: auth.adultoResponsableTelefono,
        documentoAutorizacionUrl: auth.documentoAutorizacionUrl,
      });
    }

    await this.dbPublico.insert(pagos).values({
      compraId: compra.id,
      proveedor: 'simulado',
      idempotencyKey,
      monto: montoTotal.toFixed(2),
      estado: 'pendiente',
    });

    return { compraId: compra.id, mapeo };
  }

  async confirmarPago(
    compraId: string,
    referenciaExterna: string,
    mapeo: MapeoAsientoPasajero[],
  ): Promise<{ boletos: BoletoEmitido[] }> {
    // Agrupar por cooperativa: cada grupo se escribe en su propia
    // transacción con SET LOCAL — una compra puede, en teoría, cubrir
    // asientos de más de una cooperativa (ver nota de diseño en
    // ventas.ts del esquema).
    const porCooperativa = new Map<string, MapeoAsientoPasajero[]>();
    for (const item of mapeo) {
      const lista = porCooperativa.get(item.cooperativaId) ?? [];
      lista.push(item);
      porCooperativa.set(item.cooperativaId, lista);
    }

    const boletosEmitidos: BoletoEmitido[] = [];

    for (const [cooperativaId, items] of porCooperativa) {
      await ejecutarComoCooperativa(this.dbApp, cooperativaId, async (tx) => {
        for (const item of items) {
          const asientoRows = await tx.execute(
            sql`SELECT id FROM viaje_asientos WHERE viaje_id = ${item.viajeId} AND numero_asiento = ${item.numeroAsiento}`,
          );
          const viajeAsientoId = (asientoRows.rows[0] as { id: string }).id;

          await tx.execute(
            sql`UPDATE viaje_asientos SET estado = 'ocupado' WHERE id = ${viajeAsientoId}`,
          );

          const codigoQr = randomUUID();
          const boletoRows = await tx.execute(
            sql`INSERT INTO boletos (cooperativa_id, compra_id, pasajero_compra_id, viaje_asiento_id, codigo_qr, precio_pagado, cargo_plataforma, iva_monto, estado)
                VALUES (${cooperativaId}, ${compraId}, ${item.pasajeroCompraId}, ${viajeAsientoId}, ${codigoQr}, ${item.precioPagado.toFixed(2)}, ${item.cargoPlataforma.toFixed(2)}, ${item.ivaMonto.toFixed(2)}, 'vigente')
                RETURNING id`,
          );
          const boletoId = (boletoRows.rows[0] as { id: string }).id;
          boletosEmitidos.push({
            id: boletoId,
            codigoQr,
            numeroAsiento: item.numeroAsiento,
            precioPagado: item.precioPagado,
            tasaTerminal: item.tasaTerminal,
            cargoPlataforma: item.cargoPlataforma,
            ivaMonto: item.ivaMonto,
          });

          // RF-TICKET-002 — comprobante de tasa de terminal, uno por
          // pasajero, referenciando el punto de operación de origen.
          const rutaOrigen = await tx.execute(
            sql`SELECT r.origen_punto_operacion_id AS id FROM viajes v
                JOIN rutas r ON r.id = v.ruta_id
                WHERE v.id = ${item.viajeId}`,
          );
          const puntoOperacionId = (rutaOrigen.rows[0] as { id: string }).id;

          await tx.execute(
            sql`INSERT INTO comprobantes_tasa_terminal (boleto_id, punto_operacion_id, monto, codigo_verificacion)
                VALUES (${boletoId}, ${puntoOperacionId}, ${item.tasaTerminal.toFixed(2)}, ${randomUUID()})`,
          );
        }
      });
    }

    await this.dbPublico
      .update(pagos)
      .set({ estado: 'aprobado', referenciaExterna })
      .where(eq(pagos.compraId, compraId));

    return { boletos: boletosEmitidos };
  }

  async rechazarPago(compraId: string, motivo: string): Promise<void> {
    await this.dbPublico
      .update(pagos)
      .set({ estado: 'rechazado', respuestaProveedor: { motivo } })
      .where(eq(pagos.compraId, compraId));
  }

  async cancelarBoleto(
    boletoId: string,
    usuarioId: string,
  ): Promise<{ ok: true } | { ok: false; motivo: string }> {
    const [fila] = await this.dbPublico
      .select({
        estado: boletos.estado,
        viajeAsientoId: boletos.viajeAsientoId,
        compradorUsuarioId: compras.compradorUsuarioId,
        horaSalidaProgramada: viajes.horaSalidaProgramada,
      })
      .from(boletos)
      .innerJoin(compras, eq(boletos.compraId, compras.id))
      .innerJoin(viajeAsientos, eq(boletos.viajeAsientoId, viajeAsientos.id))
      .innerJoin(viajes, eq(viajeAsientos.viajeId, viajes.id))
      .where(eq(boletos.id, boletoId));

    if (!fila || fila.compradorUsuarioId !== usuarioId) {
      return { ok: false, motivo: 'Este boleto no existe o no te pertenece.' };
    }
    if (fila.estado !== 'vigente') {
      return {
        ok: false,
        motivo:
          fila.estado === 'usado'
            ? 'Este boleto ya fue usado, no se puede cancelar.'
            : 'Este boleto ya estaba cancelado.',
      };
    }

    const [config] = await this.dbPublico
      .select({ horas: configuracionPlataforma.cancelacionHorasMinimasAntes })
      .from(configuracionPlataforma)
      .limit(1);
    // Valor de reserva conservador si nadie lo ha configurado todavía —
    // ver comentario completo en packages/db/schema/configuracion.ts.
    const horasMinimas = config?.horas ?? 2;
    const limite = new Date(fila.horaSalidaProgramada);
    limite.setHours(limite.getHours() - horasMinimas);
    if (new Date() > limite) {
      return {
        ok: false,
        motivo: `Ya no se puede cancelar — faltan menos de ${horasMinimas} horas para la salida.`,
      };
    }

    await this.dbPublico
      .update(boletos)
      .set({ estado: 'cancelado' })
      .where(eq(boletos.id, boletoId));
    await this.dbPublico
      .update(viajeAsientos)
      .set({ estado: 'disponible', holdUsuarioId: null, holdExpiraEn: null })
      .where(eq(viajeAsientos.id, fila.viajeAsientoId));

    return { ok: true };
  }

  // ─────────────────────────────────────────────────────────────
  // Reprogramación con crédito (Fase C, 29-jul-2026)
  // ─────────────────────────────────────────────────────────────

  async obtenerDetalleBoletoParaReprogramar(
    boletoId: string,
    usuarioId: string,
  ) {
    const [fila] = await this.dbPublico
      .select({
        estado: boletos.estado,
        viajeAsientoId: boletos.viajeAsientoId,
        compradorUsuarioId: compras.compradorUsuarioId,
        horaSalidaProgramada: viajes.horaSalidaProgramada,
        cooperativaId: viajes.cooperativaId,
        precioPagado: boletos.precioPagado,
        pasajeroCompraId: boletos.pasajeroCompraId,
        nombreCompleto: pasajerosCompra.nombreCompleto,
        documento: pasajerosCompra.documento,
        tipoTarifa: pasajerosCompra.tipoTarifa,
        fechaNacimiento: pasajerosCompra.fechaNacimiento,
      })
      .from(boletos)
      .innerJoin(compras, eq(boletos.compraId, compras.id))
      .innerJoin(viajeAsientos, eq(boletos.viajeAsientoId, viajeAsientos.id))
      .innerJoin(viajes, eq(viajeAsientos.viajeId, viajes.id))
      .innerJoin(
        pasajerosCompra,
        eq(boletos.pasajeroCompraId, pasajerosCompra.id),
      )
      .where(eq(boletos.id, boletoId));

    if (!fila || fila.compradorUsuarioId !== usuarioId) return null;

    const [tasaFila] = await this.dbPublico
      .select({ monto: comprobantesTasaTerminal.monto })
      .from(comprobantesTasaTerminal)
      .where(eq(comprobantesTasaTerminal.boletoId, boletoId));

    return {
      ...fila,
      precioPagado: Number(fila.precioPagado),
      tasaTerminal: Number(tasaFila?.monto ?? 0),
    };
  }

  async obtenerHorasLimiteReprogramacion(
    cooperativaId: string,
  ): Promise<number> {
    const [coop] = await this.dbPublico
      .select({ horas: cooperativas.horasLimiteReprogramacion })
      .from(cooperativas)
      .where(eq(cooperativas.id, cooperativaId));
    // Valor de reserva conservador si la cooperativa no lo configuró
    // todavía — mismo patrón que cancelacionHorasMinimasAntes.
    return coop?.horas ?? 2;
  }

  async cancelarBoletoPorReprogramacion(
    boletoId: string,
    viajeAsientoId: string,
  ): Promise<void> {
    // Deliberadamente sin volver a chequear el límite de horas — ya se
    // validó específicamente para reprogramación antes de llegar aquí,
    // con la ventana propia de cada cooperativa, no la de cancelación
    // general.
    await this.dbPublico
      .update(boletos)
      .set({ estado: 'cancelado' })
      .where(eq(boletos.id, boletoId));
    await this.dbPublico
      .update(viajeAsientos)
      .set({ estado: 'disponible', holdUsuarioId: null, holdExpiraEn: null })
      .where(eq(viajeAsientos.id, viajeAsientoId));
  }

  async crearCreditoPasajero(
    usuarioId: string,
    cooperativaId: string,
    monto: number,
    boletoOrigenId: string,
  ): Promise<void> {
    await this.dbPublico.insert(creditosPasajero).values({
      usuarioId,
      cooperativaId,
      monto: monto.toFixed(2),
      boletoOrigenId,
    });
  }

  async obtenerReciboCompra(
    compraId: string,
    usuarioId: string,
  ): Promise<ReciboCompra | null> {
    const [compra] = await this.dbPublico
      .select({
        id: compras.id,
        compradorUsuarioId: compras.compradorUsuarioId,
        montoTotal: compras.montoTotal,
        montoTarifasCooperativa: compras.montoTarifasCooperativa,
        montoCargoPlataforma: compras.montoCargoPlataforma,
        montoTasaTerminal: compras.montoTasaTerminal,
        montoImpuestos: compras.montoImpuestos,
      })
      .from(compras)
      .where(eq(compras.id, compraId));

    // Igual que en validarBoletoPorQr: no se distingue "no existe" de
    // "no te pertenece" -- nunca se revela si una compra ajena existe.
    if (!compra || compra.compradorUsuarioId !== usuarioId) {
      return null;
    }

    const [pago] = await this.dbPublico
      .select({ proveedor: pagos.proveedor, estado: pagos.estado })
      .from(pagos)
      .where(eq(pagos.compraId, compraId));

    // Drizzle exige alias() para unir la misma tabla dos veces en una
    // sola consulta (aqui: puntos_operacion como origen Y como destino).
    const origen = alias(puntosOperacion, 'origen');
    const destino = alias(puntosOperacion, 'destino');

    const filasBoletos = await this.dbPublico
      .select({
        boletoId: boletos.id,
        codigoQr: boletos.codigoQr,
        numeroAsiento: viajeAsientos.numeroAsiento,
        precioPagado: boletos.precioPagado,
        estado: boletos.estado,
        pasajeroNombre: pasajerosCompra.nombreCompleto,
        pasajeroDocumento: pasajerosCompra.documento,
        cooperativaNombre: cooperativas.nombreComercial,
        rutaOrigenCiudad: origen.ciudad,
        rutaDestinoCiudad: destino.ciudad,
        fechaSalida: viajes.fechaSalida,
        horaSalidaProgramada: viajes.horaSalidaProgramada,
      })
      .from(boletos)
      .innerJoin(pasajerosCompra, eq(boletos.pasajeroCompraId, pasajerosCompra.id))
      .innerJoin(viajeAsientos, eq(boletos.viajeAsientoId, viajeAsientos.id))
      .innerJoin(viajes, eq(viajeAsientos.viajeId, viajes.id))
      .innerJoin(rutas, eq(viajes.rutaId, rutas.id))
      .innerJoin(cooperativas, eq(boletos.cooperativaId, cooperativas.id))
      .innerJoin(origen, eq(rutas.origenPuntoOperacionId, origen.id))
      .innerJoin(destino, eq(rutas.destinoPuntoOperacionId, destino.id))
      .where(eq(boletos.compraId, compraId));

    // 27-jul-2026 -- mismo criterio que en CheckoutService: el valor
    // real sigue en compras.montoImpuestos sin tocarse; solo se
    // transforma lo que se le devuelve al pasajero en este recibo,
    // segun el modo configurado desde el Panel Admin.
    const modoIva = await this.obtenerModoIvaBoleto();
    let montoImpuestosRespuesta = Number(compra.montoImpuestos);
    let ivaVisible = true;
    if (modoIva === 'cero') {
      montoImpuestosRespuesta = 0;
    } else if (modoIva === 'oculto') {
      ivaVisible = false;
    }

    return {
      compraId: compra.id,
      montoTotal: Number(compra.montoTotal),
      montoTarifasCooperativa: Number(compra.montoTarifasCooperativa),
      montoCargoPlataforma: Number(compra.montoCargoPlataforma),
      montoTasaTerminal: Number(compra.montoTasaTerminal),
      montoImpuestos: montoImpuestosRespuesta,
      ivaVisible,
      pagoProveedor: pago?.proveedor ?? 'desconocido',
      pagoEstado: pago?.estado ?? 'desconocido',
      boletos: filasBoletos.map((b) => ({
        boletoId: b.boletoId,
        codigoQr: b.codigoQr,
        numeroAsiento: b.numeroAsiento,
        precioPagado: Number(b.precioPagado),
        estado: b.estado,
        pasajeroNombre: b.pasajeroNombre,
        pasajeroDocumento: b.pasajeroDocumento,
        cooperativaNombre: b.cooperativaNombre,
        rutaOrigenCiudad: b.rutaOrigenCiudad,
        rutaDestinoCiudad: b.rutaDestinoCiudad,
        fechaSalida: b.fechaSalida,
        horaSalidaProgramada: b.horaSalidaProgramada.toISOString(),
      })),
    };
  }

  async notificarCompraConfirmada(
    compraId: string,
    montoTotal: number,
    cantidadBoletos: number,
  ): Promise<void> {
    const filas = await this.dbPublico.execute(sql`
      SELECT u.correo
      FROM compras c
      JOIN usuarios u ON u.id = c.comprador_usuario_id
      WHERE c.id = ${compraId}
    `);
    const fila = filas.rows[0] as { correo: string } | undefined;

    // RF-CHECK-006 -- una venta de ventanilla puede no tener comprador
    // con cuenta propia; sin correo, no hay a quien notificar.
    if (!fila?.correo) return;

    const [notif] = await this.dbPublico
      .insert(notificaciones)
      .values({
        tipo: 'confirmacion_compra',
        canal: 'correo',
        compraId,
        correoDestino: fila.correo,
        estadoEnvio: 'pendiente',
      })
      .returning();

    try {
      await this.email.enviarConfirmacionCompra(fila.correo, {
        compraId,
        montoTotal,
        cantidadBoletos,
      });
      await this.dbPublico
        .update(notificaciones)
        .set({ estadoEnvio: 'enviado', enviadoEn: new Date() })
        .where(eq(notificaciones.id, notif.id));
    } catch (error) {
      // RNF-DISP-002 -- ninguna venta confirmada se pierde silenciosamente,
      // pero un fallo de notificacion tampoco debe reventar la venta ya
      // aprobada. Se registra el fallo y se sigue.
      const mensaje = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`No se pudo notificar la compra ${compraId}: ${mensaje}`);
      await this.dbPublico
        .update(notificaciones)
        .set({ estadoEnvio: 'fallido', errorDetalle: mensaje })
        .where(eq(notificaciones.id, notif.id));
    }
  }

  async obtenerModoIvaBoleto(): Promise<'calculado' | 'cero' | 'oculto'> {
    const resultado = await this.dbPublico.execute(
      sql`SELECT modo_iva_boleto FROM configuracion_plataforma LIMIT 1`,
    );
    const fila = resultado.rows[0] as { modo_iva_boleto: string } | undefined;
    return (fila?.modo_iva_boleto as 'calculado' | 'cero' | 'oculto') ?? 'calculado';
  }
}