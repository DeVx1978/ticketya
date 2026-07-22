/**
 * Tenancy: cooperativas y puntos de operación.
 *
 * `cooperativas` es el tenant raíz del sistema multi-tenant (RNF-ESC-001,
 * RNF-SEG-003). `puntos_operacion` modela RF-FLOTA-003: un único tipo con
 * discriminador para terminal terrestre / oficina-agencia / parada
 * intermedia, en vez de tres tablas separadas — comparten casi todos los
 * atributos (ubicación, regla de tasa) y participan de la misma jerarquía
 * en rutas y viajes.
 */
import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  doublePrecision,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { estadoCooperativaEnum, modeloIntegracionEnum, tipoPuntoOperacionEnum } from './enums';

export const cooperativas = pgTable(
  'cooperativas',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // RL-006 / RN-007 — sujeto tributario propio, RUC obligatorio para
    // poder emitir su comprobante de la venta.
    ruc: varchar('ruc', { length: 13 }).notNull(),
    razonSocial: varchar('razon_social', { length: 200 }).notNull(),
    nombreComercial: varchar('nombre_comercial', { length: 150 }).notNull(),

    // RF-COOP-001 — autoregistro sujeto a aprobación.
    estado: estadoCooperativaEnum('estado').default('pendiente_revision').notNull(),

    // SRS 3.11 (corrección v1.2) — Modelo A y Modelo B son opciones
    // permanentes y paralelas, elegidas por la cooperativa al afiliarse.
    // No hay valor por defecto implícito: se exige elegir explícitamente
    // en el flujo de afiliación (RF-COOP-001), por eso no tiene .default().
    modeloIntegracion: modeloIntegracionEnum('modelo_integracion').notNull(),

    contactoNombre: varchar('contacto_nombre', { length: 150 }),
    contactoCorreo: varchar('contacto_correo', { length: 200 }),
    contactoTelefono: varchar('contacto_telefono', { length: 20 }),

    fechaAfiliacion: timestamp('fecha_afiliacion', { withTimezone: true }),

    // IVA (impuesto al valor agregado) — se asume, por defecto, YA
    // incluido dentro del precio del boleto (así opera hoy la mayoría de
    // cooperativas en Ecuador, tasa vigente 15%). Configurable por
    // cooperativa porque cada una puede tener un caso distinto: alguna
    // podría manejar 0% (exenta), o simplemente no querer mostrarlo
    // desglosado en el boleto aunque sí lo esté pagando. No se guarda
    // como parte de "configuracion_plataforma" (esa es global) porque
    // esta decisión es explícitamente por cooperativa.
    ivaPorcentaje: numeric('iva_porcentaje', { precision: 5, scale: 2 })
      .default('15.00')
      .notNull(),
    ivaVisibleEnBoleto: boolean('iva_visible_en_boleto').default(true).notNull(),
    // true = el valor de arriba se actualiza solo cuando el admin de
    // plataforma cambia el IVA nacional (comportamiento por defecto).
    // false = la cooperativa fijó su propio valor manualmente (ej.
    // exenta, o caso especial) y las actualizaciones masivas no la
    // tocan. Al editar su propio ivaPorcentaje desde el Panel Empresa,
    // esto pasa a false automáticamente — puede volver a true cuando
    // quiera "seguir de nuevo" el valor nacional.
    ivaSigueTasaNacional: boolean('iva_sigue_tasa_nacional').default(true).notNull(),

    // Logo de la cooperativa (22-jul-2026) — se guarda solo la URL, no
    // el archivo en sí. La imagen vive en un servicio externo de
    // almacenamiento (ej. Cloudinary) que la cooperativa ya usa o
    // configura aparte; aquí no se construye un pipeline de subida de
    // archivos propio todavía, sería sobre-construcción para lo que se
    // necesita hoy. Nullable: no toda cooperativa tiene logo cargado.
    logoUrl: text('logo_url'),

    creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_cooperativas_ruc').on(t.ruc),
    index('idx_cooperativas_estado').on(t.estado),
  ],
);

export const puntosOperacion = pgTable(
  'puntos_operacion',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    tipo: tipoPuntoOperacionEnum('tipo').notNull(),
    nombre: varchar('nombre', { length: 150 }).notNull(),

    // Para 'oficina_agencia': la oficina suele pertenecer y ser operada
    // por una única cooperativa en su parroquia/pueblo. Para
    // 'terminal_terrestre': es infraestructura pública/independiente,
    // compartida por muchas cooperativas — por eso esta columna es
    // nullable, no obligatoria.
    cooperativaPropietariaId: uuid('cooperativa_propietaria_id').references(() => cooperativas.id),

    ciudad: varchar('ciudad', { length: 100 }).notNull(),
    provincia: varchar('provincia', { length: 100 }).notNull(),
    direccion: text('direccion'),

    // Geolocalización (Arquitectura Técnica 4.1 — PostGIS). Se modelan
    // lat/lng como columnas simples aquí porque drizzle-orm no tiene un
    // builder nativo para el tipo `geography` de PostGIS en esta versión;
    // si se necesitan consultas espaciales reales (distancia, radio), debe
    // añadirse una columna `geography(Point, 4326)` vía migración SQL
    // manual (ver migrations/manual/002_postgis_puntos_operacion.sql) y
    // mantenerla sincronizada con lat/lng mediante trigger o en la capa de
    // aplicación.
    latitud: doublePrecision('latitud'),
    longitud: doublePrecision('longitud'),

    // RF-FLOTA-003 — "su propia regla de tasa (incluyendo $0 si no
    // aplica)". Nullable: un punto sin regla definida no debe asumirse
    // como $0 silenciosamente, debe tratarse como "regla pendiente de
    // configurar" a nivel de aplicación.
    tasaMonto: numeric('tasa_monto', { precision: 8, scale: 2 }),

    // RL-006 / decisión pendiente #4 del traspaso — un terminal terrestre
    // es su propio sujeto tributario y necesita RUC propio para emitir su
    // comprobante (RF-TICKET-002). Solo aplica a tipo='terminal_terrestre';
    // se deja nullable en vez de crear una tabla separada solo por esto.
    rucTerminal: varchar('ruc_terminal', { length: 13 }),

    // RN-007 / decisión pendiente #4 del traspaso: cuenta bancaria y
    // periodicidad de liquidación con el Terminal de Machala, aún no
    // confirmadas. Se dejan como columnas nullable con nota explícita en
    // vez de inventar un valor o una estructura rígida antes de tiempo.
    liquidacionBanco: varchar('liquidacion_banco', { length: 100 }),
    liquidacionNumeroCuenta: varchar('liquidacion_numero_cuenta', { length: 50 }),
    liquidacionTipoCuenta: varchar('liquidacion_tipo_cuenta', { length: 20 }),
    liquidacionTitular: varchar('liquidacion_titular', { length: 150 }),
    liquidacionPeriodicidadDias: numeric('liquidacion_periodicidad_dias', { precision: 3, scale: 0 }),

    creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_puntos_operacion_tipo').on(t.tipo),
    index('idx_puntos_operacion_ciudad').on(t.ciudad),
    index('idx_puntos_operacion_cooperativa_propietaria').on(t.cooperativaPropietariaId),
  ],
);

export const cooperativasRelations = relations(cooperativas, ({ many }) => ({
  puntosOperacionPropios: many(puntosOperacion),
}));

export const puntosOperacionRelations = relations(puntosOperacion, ({ one }) => ({
  cooperativaPropietaria: one(cooperativas, {
    fields: [puntosOperacion.cooperativaPropietariaId],
    references: [cooperativas.id],
  }),
}));
