/**
 * Enums compartidos por todo el esquema de TicketYa.
 *
 * Cada enum referencia el/los requerimiento(s) del SRS v1.2 que lo originan,
 * para que quien lea el esquema pueda trazar de vuelta al documento de
 * requerimientos sin tener que adivinar el porqué de cada valor.
 */
import { pgEnum } from 'drizzle-orm/pg-core';

/** RF-AUTH-004 — Roles y permisos (RBAC). */
export const rolUsuarioEnum = pgEnum('rol_usuario', [
  'pasajero',
  'vendedor',
  'admin_cooperativa',
  'admin_plataforma',
]);

/**
 * RN-007 / SRS 3.11 — Modelo A (Panel Empresa) y Modelo B (integración API)
 * son opciones de negocio permanentes y paralelas, no una jerarquía. Este
 * enum vive a nivel de cooperativa, no de venta.
 */
export const modeloIntegracionEnum = pgEnum('modelo_integracion', ['modelo_a', 'modelo_b']);

/** RF-COOP-001 — una afiliación pasa por revisión antes de operar. */
export const estadoCooperativaEnum = pgEnum('estado_cooperativa', [
  'pendiente_revision',
  'aprobada',
  'suspendida',
  'dada_de_baja',
]);

/**
 * RF-FLOTA-003 — jerarquía de puntos de operación. Terminal terrestre,
 * oficina/agencia de pueblo o parroquia, y parada intermedia en ruta.
 * Se modela como un solo tipo con discriminador, no como tres tablas
 * separadas, porque comparten la mayoría de atributos (nombre, ubicación,
 * regla de tasa) y participan de la misma jerarquía en rutas y viajes.
 */
export const tipoPuntoOperacionEnum = pgEnum('tipo_punto_operacion', [
  'terminal_terrestre',
  'oficina_agencia',
  'parada_intermedia',
]);

/** RF-CHECK-001 / RN-001 — tarifas diferenciadas (LOTTTSV Art. 79). */
export const tipoTarifaEnum = pgEnum('tipo_tarifa', [
  'adulto',
  'nino',
  'tercera_edad',
  'discapacidad',
]);

/**
 * RF-COOP-002 / RF-NOTIF-003 — ciclo de vida de una instancia de viaje
 * programada (no de la ruta en abstracto).
 */
export const estadoViajeEnum = pgEnum('estado_viaje', [
  'programado',
  'en_curso',
  'finalizado',
  'cancelado',
]);

/** RF-SEAT-003 — estado visual/operativo de un asiento en un viaje específico. */
export const estadoAsientoEnum = pgEnum('estado_asiento', [
  'disponible',
  'bloqueado_temporal',
  // Métodos de pago manuales (29-jul-2026) — a diferencia de
  // 'bloqueado_temporal' (minutos, mientras se completa un pago con
  // tarjeta), este NO expira solo: el asiento queda reservado hasta
  // que la cooperativa confirme o rechace el comprobante subido. Sin
  // esto, alguien más podría tomar el asiento mientras se revisa el
  // pago de otro pasajero.
  'pendiente_confirmacion_pago',
  'ocupado',
]);

/** RF-CHECK-004/005 — estado de una transacción de pago. */
export const estadoPagoEnum = pgEnum('estado_pago', [
  'pendiente',
  'aprobado',
  'rechazado',
  'revertido',
]);

/** RF-CHECK-006 — canal por el que se originó la compra. */
export const canalVentaEnum = pgEnum('canal_venta', ['en_linea', 'ventanilla']);

/** RF-TICKET-001/004 — ciclo de vida de un boleto individual. */
export const estadoBoletoEnum = pgEnum('estado_boleto', [
  'vigente',
  'usado',
  'cancelado',
]);

/**
 * RF-TICKET-003 / RL-006 — hasta 3 comprobantes electrónicos por venta,
 * uno por cada sujeto tributario (cooperativa, terminal, plataforma).
 * Ver nota de decisión pendiente: la arquitectura de 3 comprobantes está
 * modelada como diseño propuesto, a validar con contador/tributarista
 * (sección 6, RL-006 del SRS).
 */
export const sujetoTributarioEnum = pgEnum('sujeto_tributario', [
  'cooperativa',
  'terminal',
  'plataforma',
]);

export const estadoComprobanteEnum = pgEnum('estado_comprobante', [
  'pendiente_autorizacion',
  'autorizado',
  'rechazado',
  'reintento',
]);

/** RF-MENOR-002 — vínculo del menor con la compra. */
export const tipoAcompanamientoMenorEnum = pgEnum('tipo_acompanamiento_menor', [
  'con_padre_madre_tutor',
  'con_autorizacion',
]);

/** RF-NOTIF — canal de envío. */
export const canalNotificacionEnum = pgEnum('canal_notificacion', [
  'correo',
  'whatsapp',
]);

/** RF-NOTIF — tipo de evento notificado. */
export const tipoNotificacionEnum = pgEnum('tipo_notificacion', [
  'confirmacion_compra',
  'recordatorio_viaje',
  'cambio_operativo',
]);

/** RF-ADMIN-005 — auditoría de acciones administrativas críticas. */
export const accionAuditoriaEnum = pgEnum('accion_auditoria', [
  'aprobacion_cooperativa',
  'baja_cooperativa',
  'cambio_comision',
  'aprobacion_campana',
  'ajuste_liquidacion',
  'actualizacion_iva_nacional',
]);

/** RF-COMM-002 — planes comerciales diferenciados. */
export const planComercialEnum = pgEnum('plan_comercial', ['basico', 'destacado', 'premium']);

/** RF-COMM-007 — moderación de contenido publicitario. */
export const estadoCampanaEnum = pgEnum('estado_campana', [
  'pendiente_revision',
  'aprobada',
  'rechazada',
  'activa',
  'vencida',
]);

/** RF-COMM-003 — seguimiento comercial de leads de anunciantes. */
export const estadoLeadEnum = pgEnum('estado_lead', ['nuevo', 'contactado', 'cerrado']);

/** RF-COMM-008 — formato de creatividad soportado (video solo en Premium). */
export const formatoCreatividadEnum = pgEnum('formato_creatividad', [
  'imagen_texto',
  'imagen_texto_video',
]);

/** RF-API-004 — estado de una reserva confirmada bajo Modelo B. */
export const estadoReservaApiEnum = pgEnum('estado_reserva_api', [
  'confirmada',
  'revertida',
]);

/**
 * Categoría de vehículo (29-jul-2026, hallazgo real del usuario): antes
 * "tipo de vehículo" era solo texto libre (ej. "Van 15 puestos"), sin
 * ninguna categoría estructurada detrás — el sistema no podía filtrar
 * búsquedas por tipo ni distinguirlos automáticamente. El nombre libre
 * sigue existiendo (para "Doble piso VIP" vs. "Estándar 2+2" dentro de
 * la misma categoría "bus"), esta categoría es la clasificación de más
 * alto nivel.
 */
export const categoriaVehiculoEnum = pgEnum('categoria_vehiculo', [
  'bus',
  'buseta',
  'van',
  'auto',
]);

/**
 * Métodos de pago manuales (29-jul-2026) — mientras no hay una
 * pasarela real conectada (decisión de negocio pendiente), cada
 * cooperativa opera con lo que ya usa en Ecuador de todas formas:
 * transferencia bancaria, efectivo, DeUna, PayPhone (billetera, no la
 * pasarela con el mismo nombre). `tarjeta_pasarela` queda reservado
 * para cuando se conecte una pasarela real — el catálogo ya está listo
 * para esa fecha, no hay que rediseñar nada, solo agregar el proveedor.
 */
export const tipoMetodoPagoEnum = pgEnum('tipo_metodo_pago', [
  'transferencia_bancaria',
  'efectivo',
  'deuna',
  'payphone',
  'tarjeta_pasarela',
]);

/** Solicitud de factura del pasaje (29-jul-2026) -- ver solicitudes-factura.ts para el contexto completo. */
export const estadoSolicitudFacturaEnum = pgEnum('estado_solicitud_factura', [
  'pendiente',
  'emitida',
]);
