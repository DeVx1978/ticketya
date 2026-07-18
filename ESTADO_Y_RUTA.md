# TicketYa — Estado del proyecto y ruta de trabajo por fases

**Última actualización:** 18 de julio de 2026
**Repositorio:** https://github.com/DeVx1978/ticketya (privado)

Este documento es el punto de partida para cualquier sesión de trabajo
futura (con Claude o con quien sea) — reemplaza la necesidad de "memoria".
Está basado en 3 documentos de mayor autoridad, ya en el repositorio o en
posesión del director del proyecto:

1. `TicketYa_SRS_v1.2` — Especificación de Requerimientos.
2. `TicketYa_Arquitectura_Tecnica_v1.0` — Stack y decisiones técnicas.
3. Este documento — estado de avance y próximos pasos.

---

## De dónde partimos

TicketYa es una plataforma SaaS multi-tenant de venta de pasajes de bus
interprovincial en Ecuador. Piloto en Terminal Terrestre de Machala →
expansión nacional → Colombia. Stack decidido: Next.js + NestJS +
PostgreSQL + Drizzle ORM + Row-Level Security multi-tenant, monorepo
Turborepo.

## A dónde debemos llegar

Un sistema en producción donde un pasajero busca ruta, elige asiento,
paga una vez, y recibe boleto digital con QR — con panel de gestión para
cada cooperativa y panel de administración de plataforma.

---

## ✅ Fase 0 — Fundaciones de datos (COMPLETADA)

- [x] Documento SRS v1.2 (requerimientos completos, 12 módulos funcionales)
- [x] Documento de Arquitectura Técnica v1.0 (stack definido y justificado)
- [x] **Esquema completo de base de datos** (33 tablas) en Drizzle ORM,
      con Row-Level Security multi-tenant activada y verificada
      funcionalmente (no solo compilada)
- [x] PostgreSQL 17 instalado y corriendo localmente (Windows)
- [x] Base de datos `ticketya` creada, con las 33 tablas y las 3
      migraciones manuales de seguridad aplicadas (BYPASSRLS del admin,
      GRANTs del rol de aplicación, auditoría inmutable)
- [x] Proyecto respaldado en GitHub: `DeVx1978/ticketya` (privado)

**Decisiones de negocio que quedaron pendientes** (nullable en la base de
datos a propósito, no asumidas — ver `packages/db/README.md` en el repo
para el detalle completo):
- Comisión de plataforma (RN-003)
- Ventana de bloqueo temporal de asiento (RN-004)
- Política de cancelación/reembolso (RN-005)
- Cuenta bancaria y periodicidad de liquidación del Terminal de Machala
- Nombre exacto del identificador operativo de unidad ("disco"/turno)
- Arquitectura de 3 comprobantes SRI por venta (validar con contador)
- Tarifas de planes comerciales de publicidad

---

## 🔲 Fase 1 — Fundaciones de código (EN PROGRESO)

Esto es lo que sigue ahora mismo. Convertir la carpeta actual del
repositorio (que hoy solo tiene `packages/db`) en el monorepo real que la
Arquitectura Técnica define.

- [x] Estructura de monorepo con Turborepo (`apps/api` con NestJS,
      `packages/db` ya existía) — **verificado con Postgres real:
      `turbo run typecheck` y `turbo run build` pasan limpio en ambos
      paquetes**
- [x] Backend NestJS con arquitectura en capas (dominio/aplicacion/
      infraestructura/presentacion) — carpetas creadas con README
      explicando cada capa
- [x] Módulo de conexión real a Postgres (`DatabaseModule`, Drizzle +
      `pg`), inyectable globalmente
- [x] Endpoint de prueba `/salud` que consulta la base de datos real (no
      solo confirma que el servidor arrancó) — **verificado end-to-end en
      el entorno de Claude: devolvió `{"estado":"ok","baseDeDatos":"conectada","totalCooperativas":1}`**
- [x] **Reproducir esta misma verificación en la PC del director** —
      **CONFIRMADO el 18 de julio de 2026, noche:** backend corriendo en
      Windows, conectado a Postgres real (`ticketya`), endpoint
      `/salud` respondió `{"estado":"ok","baseDeDatos":"conectada","totalCooperativas":0}`
      (0 es correcto: la base real de producción aún no tiene datos).
- [ ] Motor de autenticación (RF-AUTH): registro, login, roles (RBAC),
      recuperación de contraseña, expiración de sesión — sobre la tabla
      `usuarios` ya existente. **Siguiente paso a construir.**

### 📍 Punto exacto de pausa

**Fase 1 completa hasta el backend base y su conexión a base de datos —
verificado en dos entornos (Claude y la PC del director).** El próximo
bloque de trabajo es construir el motor de autenticación completo
(RF-AUTH-001 a 006) dentro de `apps/api`, siguiendo la arquitectura en
capas ya preparada (`dominio/`, `aplicacion/`, `infraestructura/`,
`presentacion/`).

## 🔲 Fase 2 — Núcleo de venta (MVP)

- [ ] Búsqueda de rutas y disponibilidad (RF-BUS)
- [ ] Selección de asientos con bloqueo temporal (RF-SEAT)
- [ ] Checkout y pasajeros (RF-CHECK)
- [ ] Integración de pago con PayPhone
- [ ] Emisión de boleto digital + QR (RF-TICKET)
- [ ] Integración con proveedor de facturación electrónica SRI

## 🔲 Fase 3 — Paneles de gestión (MVP)

- [ ] Panel Empresa (gestión de rutas/unidades/flota, venta en
      ventanilla, validación de QR) — RF-COOP
- [ ] Panel Admin de plataforma (aprobación de cooperativas, comisiones,
      liquidaciones, auditoría) — RF-ADMIN

## 🔲 Fase 4 — Piloto real

- [ ] Validación con una cooperativa real del Terminal de Machala
- [ ] Confirmar terminología exacta ("disco"/turno), flujos de ventanilla

## 🔲 Fase 5 — Expansión (Fase 2 del SRS)

- [ ] Integración API Modelo B (RF-API) para cooperativas con sistema propio
- [ ] Módulo comercial/publicidad (RF-COMM)
- [ ] Kushki como segunda pasarela de pago
- [ ] Reportes avanzados

## 🔲 Fase 6 — Apps móviles

- [ ] React Native (pasajeros y validación de QR en el andén)

## 🔲 Fase 7 — Escala nacional/internacional

- [ ] Cobertura de parroquias, expansión a Colombia, recomendaciones IA

## 🔲 Fase 8 — Producto separado (visión de largo plazo)

- [ ] Transporte tipo InDrive/Uber — arquitectura y equipo completamente
      independientes del negocio de boletos

---

## Nota sobre la forma de trabajo

El director de este proyecto tiene experiencia técnica y prefiere
instrucciones directas, en bloques, sin explicaciones excesivas de cada
clic. Ir directo al grano, dar los comandos/pasos completos de una vez, y
solo detenerse a explicar cuando algo falla de verdad.
