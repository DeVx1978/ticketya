/**
 * Configuración global de la plataforma.
 *
 * Varias filas de este módulo existen específicamente para NO hardcodear
 * decisiones de negocio que el SRS marca explícitamente como pendientes de
 * validación (sección 9). En vez de asumir un valor, se modelan como
 * columnas nullable con su propia nota — quedan vacías hasta que negocio
 * las defina, y el motor de reglas (capa de dominio, ver Arquitectura
 * Técnica sección 2) debe rechazar operarlas si están en null.
 */
import { pgTable, uuid, varchar, numeric, integer, timestamp, text } from 'drizzle-orm/pg-core';

/**
 * Tabla singleton (se espera una sola fila). Se modela como tabla — no como
 * variables de entorno — porque el Panel Admin (RF-ADMIN) debe poder
 * editarla en caliente y quedar auditada (RF-ADMIN-005).
 */
export const configuracionPlataforma = pgTable('configuracion_plataforma', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Identidad tributaria propia de TicketYa como persona jurídica.
  // Necesaria para RF-COMM-006 (comprobante de venta publicitaria a nombre
  // de la plataforma) y como uno de los 3 sujetos tributarios de RL-006.
  rucPlataforma: varchar('ruc_plataforma', { length: 13 }).notNull(),
  razonSocialPlataforma: varchar('razon_social_plataforma', { length: 200 }).notNull(),

  // RN-003 — decisión pendiente: modelo y porcentaje exacto de comisión.
  // Nullable a propósito: no se asume un valor. Ver también
  // comisionPorcentajeModeloB si el modelo termina difiriendo por tipo de
  // integración (pregunta abierta explícita en RN-003).
  comisionPorcentajeModeloADefault: numeric('comision_porcentaje_modelo_a_default', {
    precision: 5,
    scale: 2,
  }),
  comisionPorcentajeModeloBDefault: numeric('comision_porcentaje_modelo_b_default', {
    precision: 5,
    scale: 2,
  }),

  // RN-002 — "cargo fijo de plataforma por pasajero", parte del desglose
  // de cobro (distinto de la comisión de arriba, que es lo que la
  // plataforma retiene de la parte de la cooperativa). Nullable a
  // propósito: no se asume un valor — si está en null, la capa de
  // aplicación lo trata como $0 y debe señalarlo como configuración
  // pendiente, no como una decisión ya tomada.
  cargoPlataformaPorPasajeroDefault: numeric('cargo_plataforma_por_pasajero_default', {
    precision: 8,
    scale: 2,
  }),

  // RN-004 — decisión pendiente: duración exacta de la ventana de bloqueo
  // temporal de asiento (referencia de industria: 5-10 min, no asumida
  // como definitiva).
  ventanaBloqueoAsientoSegundos: integer('ventana_bloqueo_asiento_segundos'),

  // RN-005 / RF-TICKET-006 — decisión pendiente: política de cancelación
  // y reembolso. Se deja como texto libre estructurable a futuro (JSON)
  // en vez de columnas booleanas rígidas, porque ni siquiera el *shape*
  // de la política está definido todavía (total/parcial/nota de crédito,
  // uniforme vs. por cooperativa).
  politicaCancelacionNotas: text('politica_cancelacion_notas'),

  // Ventana mínima antes de la salida para poder cancelar un boleto
  // (22-jul-2026) — sí se implementó la ACCIÓN de cancelar (antes no
  // existía ninguna forma de hacerlo, ni siquiera manualmente), pero el
  // reembolso monetario real queda fuera de este alcance porque los
  // pagos hoy son simulados (ver infraestructura/pagos/simulador.pasarela.ts)
  // — no hay dinero real que devolver todavía. Nullable, mismo criterio
  // que el resto de este archivo: si está en null, la capa de aplicación
  // usa un valor de reserva conservador (2 horas) y lo señala como
  // configuración pendiente, no como decisión ya tomada.
  cancelacionHorasMinimasAntes: integer('cancelacion_horas_minimas_antes'),

  // IVA vigente a nivel nacional (Ecuador, 15% al momento de este
  // diseño — 21-jul-2026). Es el valor que se propaga a todas las
  // cooperativas que tengan "iva_sigue_tasa_nacional = true" cuando el
  // admin de plataforma actualiza este campo. Las cooperativas con un
  // valor propio manual (false) no se tocan al propagar — ver
  // cooperativas.ivaSigueTasaNacional en tenancy.ts.
  ivaPorcentajeNacional: numeric('iva_porcentaje_nacional', {
    precision: 5,
    scale: 2,
  })
    .default('15.00')
    .notNull(),

  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).defaultNow().notNull(),
});
