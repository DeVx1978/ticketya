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
- [x] Motor de autenticación (RF-AUTH): registro, login, roles (RBAC),
      bloqueo por intentos fallidos — sobre la tabla `usuarios` ya
      existente. **Verificado con Postgres real en dos entornos** (Claude
      y la PC del director): registro, login, endpoint protegido con y
      sin token, rechazo de credenciales inválidas, rechazo de registro
      duplicado, y bloqueo de cuenta tras 5 intentos fallidos — todo
      probado y funcionando.
      - ⚠ Pendiente, no resuelto todavía: RF-AUTH-003 (recuperación de
        contraseña por correo) y RF-AUTH-005 completo (refresh token real
        — hoy el token solo expira a los 60 min desde su emisión, no
        detecta "inactividad").

## 🔲 Fase 2 — Núcleo de venta (MVP) (EN PROGRESO)

- [x] **Corrección de seguridad crítica:** el backend se conectaba como
      superusuario de Postgres, lo cual anulaba silenciosamente TODAS las
      políticas RLS (los superusuarios las ignoran por diseño de
      Postgres). Corregido: ahora usa dos roles restringidos —
      `ticketya_app` (sujeto a RLS, para operaciones de una cooperativa
      específica) y `ticketya_platform_admin` (con BYPASSRLS, para
      lecturas legítimamente cross-tenant como la búsqueda pública).
      Nueva migración manual: `004_habilitar_login_roles.sql`.
- [x] **Búsqueda de rutas y disponibilidad (RF-BUS)** — construida y
      verificada con Postgres real: autocompletado de ciudades
      (RF-BUS-002), búsqueda multi-cooperativa ordenada por hora de
      salida (RF-BUS-001/003), disponibilidad en tiempo real descontando
      asientos ocupados y bloqueados (RF-BUS-006, probado exacto: 40
      capacidad − 3 ocupados − 2 bloqueados = 35 disponibles).
- [x] **Selección de asientos con bloqueo temporal (RF-SEAT)** —
      construida y verificada con Postgres real, incluyendo el caso más
      exigente: dos solicitudes **verdaderamente simultáneas** (no
      secuenciales) sobre el mismo asiento nunca antes tocado — exactamente
      una tuvo éxito, la otra fue rechazada, y en la base de datos quedó
      una sola fila. Usa el patrón transaccional con `SET LOCAL` por
      cooperativa (`ejecutarComoCooperativa`), así que las escrituras
      también respetan RLS, no solo las lecturas. **Confirmado también en
      la PC del director** (instalación limpia, sin duplicados).
- [x] **Checkout y boleto digital (RF-CHECK + RF-TICKET núcleo)** —
      construido y verificado con Postgres real: descuentos de tarifa
      correctos (RN-001, niño 50% probado exacto: 8.50 → 4.25), boleto
      con código QR único generado tras pago aprobado, comprobante de
      tasa de terminal generado, camino de rechazo probado (el asiento
      NO se pierde, su hold sigue vigente), e idempotencia probada
      (reintentar con la misma clave devuelve la misma compra, no cobra
      dos veces). **Confirmado también en la PC del director.**
      - ⚠ Usa un **simulador de pago**, no PayPhone real — no hay
        credenciales todavía (decisión de negocio pendiente). Cuando
        existan, solo hay que reemplazar `SimuladorPasarelaPago` por una
        implementación real de la misma interfaz, sin tocar el resto.
      - ⚠ No incluye todavía: facturación electrónica SRI real (RL-006,
        pendiente de validar con contador), envío de correo/WhatsApp del
        boleto (depende de un módulo de notificaciones no construido), ni
        el flujo completo de menores de edad (RF-MENOR — solo se detecta
        y marca la bandera `es_menor_edad`, no se pide/valida
        autorización todavía).

## ✅ Núcleo de venta (MVP) — CICLO COMPLETO FUNCIONANDO

Con esto, un pasajero puede: buscar rutas → ver asientos disponibles →
bloquear un asiento → pagar (simulado) → recibir su boleto con QR. Las 5
piezas centrales de la Fase 2 están construidas y confirmadas en ambos
entornos.

### 📍 Punto exacto de pausa

Lo que sigue, en orden de la Arquitectura Técnica (sección 9): **Fase 3 —
Paneles de gestión** (Panel Empresa para que una cooperativa gestione sus
rutas/unidades y venda en ventanilla; Panel Admin de plataforma). Esto ya
no es "un pasajero comprando", sino "una cooperativa operando" — un
bloque de trabajo distinto y grande, buen punto para decidir con el
director si seguir ahí o resolver primero alguna de las decisiones de
negocio pendientes (comisión, política de cancelación, etc.).


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
