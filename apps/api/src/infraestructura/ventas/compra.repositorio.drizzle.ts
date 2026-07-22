import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
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
} from '../../dominio/ventas/ventas.ports';
import {
  factorDescuento,
  esMenorDeEdad,
} from '../../dominio/ventas/ventas.ports';

@Injectable()
export class CompraRepositorioDrizzle implements CompraRepositorio {
  constructor(
    @Inject(DRIZZLE_DB_PUBLICO) private readonly dbPublico: DrizzleDb,
    @Inject(DRIZZLE_DB) private readonly dbApp: DrizzleDb,
  ) {}

  async buscarPagoPorIdempotencyKey(
    idempotencyKey: string,
  ): Promise<PagoExistente | null> {
    const pago = await this.dbPublico.query.pagos.findFirst({
      where: eq(pagos.idempotencyKey, idempotencyKey),
    });
    if (!pago) return null;

    const boletosDeLaCompra = await this.dbPublico
      .select({ id: boletos.id, codigoQr: boletos.codigoQr })
      .from(boletos)
      .where(eq(boletos.compraId, pago.compraId));

    return {
      compraId: pago.compraId,
      estado: pago.estado,
      boletos: boletosDeLaCompra,
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

      mapeo.push({
        viajeId: p.viajeId,
        numeroAsiento: p.numeroAsiento,
        pasajeroCompraId: pasajeroCompra.id,
        cooperativaId: d.cooperativaId,
        precioPagado: d.precioPagado,
        tasaTerminal: d.tasaTerminal,
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
            sql`INSERT INTO boletos (cooperativa_id, compra_id, pasajero_compra_id, viaje_asiento_id, codigo_qr, precio_pagado, estado)
                VALUES (${cooperativaId}, ${compraId}, ${item.pasajeroCompraId}, ${viajeAsientoId}, ${codigoQr}, ${item.precioPagado.toFixed(2)}, 'vigente')
                RETURNING id`,
          );
          const boletoId = (boletoRows.rows[0] as { id: string }).id;
          boletosEmitidos.push({ id: boletoId, codigoQr });

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
}
