/**
 * Compras, pasajeros de la compra, boletos y pagos — RF-CHECK, RF-TICKET.
 *
 * ⚠ Decisión de diseño explícita sobre tenancy y RLS en este módulo:
 * `compras`, `pasajeros_compra` y `pagos` NO llevan `cooperativa_id` propio
 * ni política RLS de aislamiento. Razón: son entidades que pertenecen al
 * pasajero (comprador), no a una cooperativa — y RF-BUS-005 (viaje
 * redondo) permite que una sola compra cubra un tramo de ida y otro de
 * vuelta, que en teoría pueden pertenecer a cooperativas distintas si cada
 * una opera un tramo. Forzar una única `cooperativa_id` en `compras`
 * sería, en ese caso, o bien incorrecto (solo permite una cooperativa) o
 * bien un rediseño mayor (lista de cooperativas por compra) que el SRS no
 * pide explícitamente.
 *
 * En cambio, `boletos` SÍ lleva `cooperativa_id` (denormalizado desde
 * `viajes` en el momento de la creación, ya que el viaje de un boleto no
 * cambia después de comprado) y SÍ tiene RLS — porque un boleto individual
 * sí pertenece de forma inequívoca a una sola cooperativa, y es
 * exactamente la granularidad que RF-COOP-004 (dashboard de ventas del
 * día) y RF-ADMIN-003/RN-007 (comisión y liquidación por venta) necesitan
 * consultar constantemente. Esto es consistente con la arquitectura de
 * "dos capas" de aislamiento (Arquitectura Técnica 4.3): RLS protege el
 * recurso propiedad directa de la cooperativa (boletos, viajes, unidades,
 * rutas); el acceso a los datos de orden/pago del pasajero, que no son
 * propiedad de ninguna cooperativa, se controla en la capa de aplicación
 * construyendo las consultas siempre a través de `boletos`.
 */
import {
  pgTable,
  uuid,
  varchar,
  numeric,
  boolean,
  date,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { usuarios } from './usuarios';
import { cooperativas } from './tenancy';
import { viajeAsientos } from './asientos';
import { tipoTarifaEnum, estadoPagoEnum, canalVentaEnum, estadoBoletoEnum } from './enums';
import { appRole, filtroCooperativaActual } from './rls';

export const compras = pgTable(
  'compras',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Nullable: una venta de ventanilla (RF-CHECK-006) puede registrarse
    // para un pasajero sin cuenta propia en la plataforma.
    compradorUsuarioId: uuid('comprador_usuario_id').references(() => usuarios.id),

    canal: canalVentaEnum('canal').notNull(),
    // RF-CHECK-006 — "incluyendo el vendedor que la realizó", solo
    // aplica/existe cuando canal = 'ventanilla'.
    vendedorUsuarioId: uuid('vendedor_usuario_id').references(() => usuarios.id),

    // RF-CHECK-003 — desglose completo mostrado antes de pagar. Se
    // persiste el desglose (no solo el total) porque es lo que RN-002
    // exige poder auditar después, y porque los boletos individuales
    // reparten estos montos entre sí de forma no necesariamente uniforme
    // (tarifas diferenciadas de RN-001).
    montoTotal: numeric('monto_total', { precision: 10, scale: 2 }).notNull(),
    montoTarifasCooperativa: numeric('monto_tarifas_cooperativa', { precision: 10, scale: 2 }).notNull(),
    montoCargoPlataforma: numeric('monto_cargo_plataforma', { precision: 10, scale: 2 }).notNull(),
    montoTasaTerminal: numeric('monto_tasa_terminal', { precision: 10, scale: 2 }).notNull(),
    montoImpuestos: numeric('monto_impuestos', { precision: 10, scale: 2 }).notNull(),

    creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_compras_comprador').on(t.compradorUsuarioId),
    index('idx_compras_vendedor').on(t.vendedorUsuarioId),
  ],
);

/**
 * RF-CHECK-001 — datos de cada pasajero por asiento comprado.
 * RF-MENOR-001 — detección de menor de edad a partir de tarifa 'nino' o
 * fecha de nacimiento capturada.
 *
 * Una fila representa a una persona dentro de una compra; para un viaje
 * redondo (RF-BUS-005), la MISMA fila puede ser referenciada por dos
 * boletos (ida y vuelta) — ver comentario en `boletos.pasajeroCompraId`.
 */
export const pasajerosCompra = pgTable(
  'pasajeros_compra',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    compraId: uuid('compra_id')
      .references(() => compras.id)
      .notNull(),

    nombreCompleto: varchar('nombre_completo', { length: 200 }).notNull(),
    documento: varchar('documento', { length: 20 }).notNull(),
    tipoTarifa: tipoTarifaEnum('tipo_tarifa').notNull(),
    fechaNacimiento: date('fecha_nacimiento'),

    // RF-MENOR-001 — calculado/confirmado en la capa de aplicación al
    // momento del checkout (a partir de tipoTarifa='nino' o edad < 18
    // según fechaNacimiento) y persistido aquí para no tener que
    // recalcular edad histórica más adelante (la fecha del viaje ya pasó,
    // "menor al momento de viajar" debe quedar fijo).
    esMenorEdad: boolean('es_menor_edad').default(false).notNull(),
  },
  (t) => [index('idx_pasajeros_compra_compra').on(t.compraId)],
);

/**
 * RF-TICKET-001 — boleto digital único por pasajero, con QR.
 */
export const boletos = pgTable(
  'boletos',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Denormalizado desde el viaje del asiento — ver nota de diseño al
    // inicio del archivo.
    cooperativaId: uuid('cooperativa_id')
      .references(() => cooperativas.id)
      .notNull(),

    compraId: uuid('compra_id')
      .references(() => compras.id)
      .notNull(),
    pasajeroCompraId: uuid('pasajero_compra_id')
      .references(() => pasajerosCompra.id)
      .notNull(),
    // Un asiento de un viaje solo puede tener un boleto (uq abajo) —
    // consistente con RF-SEAT-005, prevención de doble venta.
    viajeAsientoId: uuid('viaje_asiento_id')
      .references(() => viajeAsientos.id)
      .notNull(),

    // Identificador único no adivinable codificado en el QR (criterio de
    // aceptación exacto de RF-TICKET-001). Se genera en la aplicación
    // (ej. UUID v4 + firma), no es simplemente el `id` de la fila para no
    // acoplar el contenido público del QR a la clave primaria interna.
    codigoQr: varchar('codigo_qr', { length: 100 }).notNull(),

    // RN-001 — precio final ya con el descuento de esta tarifa aplicado.
    precioPagado: numeric('precio_pagado', { precision: 8, scale: 2 }).notNull(),

    // Desglose informativo persistido junto al precio (22-jul-2026) —
    // antes solo vivían como cálculo de un momento en checkout.service.ts
    // y se perdían; sin guardarlos aquí, un reintento por idempotencia
    // (RF-CHECK-005) o una consulta posterior no podía reconstruir el
    // desglose real de ESTE boleto específico, solo el total agregado
    // de toda la compra.
    cargoPlataforma: numeric('cargo_plataforma', { precision: 8, scale: 2 })
      .default('0')
      .notNull(),
    ivaMonto: numeric('iva_monto', { precision: 8, scale: 2 }).default('0').notNull(),

    estado: estadoBoletoEnum('estado').default('vigente').notNull(),
    validadoEn: timestamp('validado_en', { withTimezone: true }),
    validadoPorUsuarioId: uuid('validado_por_usuario_id').references(() => usuarios.id),

    creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('uq_boletos_viaje_asiento').on(t.viajeAsientoId),
    uniqueIndex('uq_boletos_codigo_qr').on(t.codigoQr),
    index('idx_boletos_cooperativa').on(t.cooperativaId),
    index('idx_boletos_compra').on(t.compraId),
    index('idx_boletos_pasajero_compra').on(t.pasajeroCompraId),
    pgPolicy('aislamiento_cooperativa_boletos', {
      for: 'all',
      to: appRole,
      using: filtroCooperativaActual,
      withCheck: filtroCooperativaActual,
    }),
  ],
).enableRLS();

/**
 * RF-CHECK-004/005 — procesamiento de pago e idempotencia.
 * Arquitectura Técnica 5.1 — estrategia dual PayPhone (MVP) + Kushki
 * (Fase 2). `proveedor` queda como texto libre corto en vez de enum
 * cerrado a propósito: añadir un tercer proveedor no debe requerir una
 * migración de esquema, solo un nuevo valor.
 */
export const pagos = pgTable(
  'pagos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    compraId: uuid('compra_id')
      .references(() => compras.id)
      .notNull(),

    proveedor: varchar('proveedor', { length: 30 }).notNull(), // 'payphone' | 'kushki' | ...
    referenciaExterna: varchar('referencia_externa', { length: 100 }),

    // RF-CHECK-005 — la idempotencia se garantiza a nivel de base de datos
    // con un índice único sobre esta clave (generada por el cliente/backend
    // por cada intento de pago), no solo confiando en lógica de aplicación.
    idempotencyKey: varchar('idempotency_key', { length: 100 }).notNull(),

    monto: numeric('monto', { precision: 10, scale: 2 }).notNull(),
    estado: estadoPagoEnum('estado').default('pendiente').notNull(),

    // Respuesta cruda de la pasarela, para auditoría/soporte — no se
    // parsean todos los campos posibles de cada proveedor en columnas
    // propias, siguiendo el principio de "aburrido es bueno" pero sin
    // perder el detalle crudo si hace falta investigar un caso puntual.
    respuestaProveedor: jsonb('respuesta_proveedor'),

    creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('uq_pagos_idempotency_key').on(t.idempotencyKey),
    index('idx_pagos_compra').on(t.compraId),
    index('idx_pagos_estado').on(t.estado),
  ],
);

export const comprasRelations = relations(compras, ({ one, many }) => ({
  comprador: one(usuarios, { fields: [compras.compradorUsuarioId], references: [usuarios.id] }),
  vendedor: one(usuarios, { fields: [compras.vendedorUsuarioId], references: [usuarios.id] }),
  pasajeros: many(pasajerosCompra),
  boletos: many(boletos),
  pagos: many(pagos),
}));

export const pasajerosCompraRelations = relations(pasajerosCompra, ({ one, many }) => ({
  compra: one(compras, { fields: [pasajerosCompra.compraId], references: [compras.id] }),
  boletos: many(boletos),
}));

export const boletosRelations = relations(boletos, ({ one }) => ({
  cooperativa: one(cooperativas, { fields: [boletos.cooperativaId], references: [cooperativas.id] }),
  compra: one(compras, { fields: [boletos.compraId], references: [compras.id] }),
  pasajeroCompra: one(pasajerosCompra, {
    fields: [boletos.pasajeroCompraId],
    references: [pasajerosCompra.id],
  }),
  viajeAsiento: one(viajeAsientos, {
    fields: [boletos.viajeAsientoId],
    references: [viajeAsientos.id],
  }),
  validadoPor: one(usuarios, { fields: [boletos.validadoPorUsuarioId], references: [usuarios.id] }),
}));

export const pagosRelations = relations(pagos, ({ one }) => ({
  compra: one(compras, { fields: [pagos.compraId], references: [compras.id] }),
}));
