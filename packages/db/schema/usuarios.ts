/**
 * Usuarios y sesiones — RF-AUTH.
 *
 * Una sola tabla `usuarios` para los 4 roles (RF-AUTH-004) en vez de una
 * tabla por rol, porque comparten el mismo ciclo de vida de autenticación
 * (RF-AUTH-001/002/003/005) y la mayoría de sus columnas. El rol determina
 * qué columnas son relevantes (ver notas de nullability por columna).
 *
 * ⚠ Nota de diseño de RLS importante: esta tabla mezcla filas con dueño de
 * tenant (vendedor, admin_cooperativa → cooperativaId requerido) con filas
 * sin dueño de tenant (pasajero, admin_plataforma → cooperativaId null a
 * propósito, ya que un pasajero puede comprar de cualquier cooperativa).
 * Por eso usa `filtroCooperativaActualOGlobal` en vez del filtro estricto:
 * aísla correctamente al personal de otras cooperativas, pero como
 * consecuencia conocida, dos cooperativas distintas SÍ comparten
 * visibilidad de RLS sobre filas de pasajero y admin_plataforma (que no
 * son secreto de tenant). El filtrado más fino por rol dentro de esas filas
 * globales queda a cargo de la capa de aplicación (RF-AUTH-004), no de RLS.
 */
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { rolUsuarioEnum } from './enums';
import { cooperativas } from './tenancy';
import { appRole, filtroCooperativaActualOGlobal } from './rls';

export const usuarios = pgTable(
  'usuarios',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    rol: rolUsuarioEnum('rol').notNull(),

    // Requerido para 'vendedor' y 'admin_cooperativa' (RF-COOP-007);
    // debe ser NULL para 'pasajero' y 'admin_plataforma'. Esta regla se
    // aplica como CHECK a nivel de aplicación/dominio (Arquitectura
    // Técnica 2.1: la regla de negocio no vive en la infraestructura),
    // no como constraint SQL, para no acoplar la validación de rol al
    // motor de base de datos.
    cooperativaId: uuid('cooperativa_id').references(() => cooperativas.id),

    correo: varchar('correo', { length: 200 }).notNull(),
    cedula: varchar('cedula', { length: 20 }),
    nombreCompleto: varchar('nombre_completo', { length: 200 }).notNull(),
    telefono: varchar('telefono', { length: 20 }),

    // Foto de perfil (22-jul-2026) — mismo criterio que el logo de
    // cooperativa: solo se guarda la URL de una imagen ya subida a un
    // servicio externo (ej. Cloudinary), no el archivo en sí. No hay
    // pipeline de subida propio todavía.
    fotoUrl: text('foto_url'),

    // RF-AUTH-001 — null si el usuario se registró vía proveedor externo.
    passwordHash: varchar('password_hash', { length: 255 }),
    proveedorExterno: varchar('proveedor_externo', { length: 30 }), // ej. 'google'
    proveedorExternoId: varchar('proveedor_externo_id', { length: 200 }),

    // RF-AUTH-002 — protección contra fuerza bruta.
    intentosFallidos: integer('intentos_fallidos').default(0).notNull(),
    bloqueadoHasta: timestamp('bloqueado_hasta', { withTimezone: true }),

    correoVerificado: boolean('correo_verificado').default(false).notNull(),
    activo: boolean('activo').default(true).notNull(),

    creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('uq_usuarios_correo').on(t.correo),
    index('idx_usuarios_cooperativa').on(t.cooperativaId),
    index('idx_usuarios_rol').on(t.rol),
    pgPolicy('aislamiento_cooperativa_usuarios', {
      for: 'all',
      to: appRole,
      using: filtroCooperativaActualOGlobal,
      withCheck: filtroCooperativaActualOGlobal,
    }),
  ],
).enableRLS();

/**
 * RF-AUTH-003 — recuperación de contraseña vía enlace de un solo uso.
 * RF-AUTH-005 — expiración de sesión por inactividad.
 * Se modelan ambos como filas de "token" con propósito, en vez de dos
 * tablas separadas, porque comparten exactamente la misma forma (usuario,
 * token, expiración, uso único).
 */
export const tokensUsuario = pgTable(
  'tokens_usuario',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    usuarioId: uuid('usuario_id')
      .references(() => usuarios.id)
      .notNull(),
    proposito: varchar('proposito', { length: 30 }).notNull(), // 'reset_password' | 'refresh_session'
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    expiraEn: timestamp('expira_en', { withTimezone: true }).notNull(),
    usadoEn: timestamp('usado_en', { withTimezone: true }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_tokens_usuario_usuario').on(t.usuarioId),
    index('idx_tokens_usuario_proposito').on(t.proposito),
  ],
);

export const usuariosRelations = relations(usuarios, ({ one, many }) => ({
  cooperativa: one(cooperativas, {
    fields: [usuarios.cooperativaId],
    references: [cooperativas.id],
  }),
  tokens: many(tokensUsuario),
}));

export const tokensUsuarioRelations = relations(tokensUsuario, ({ one }) => ({
  usuario: one(usuarios, {
    fields: [tokensUsuario.usuarioId],
    references: [usuarios.id],
  }),
}));
