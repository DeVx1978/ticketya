# Columbus (TicketYa) -- Entrega técnica exhaustiva

Última actualización: 24-ago-2026, commit `cce6078`. Este documento asume que quien lo lee es un desarrollador con experiencia -- no explica conceptos básicos de NestJS/Next.js/Drizzle, solo lo específico y no obvio de este proyecto en particular. Para el historial completo día a día de decisiones, ver `DOCUMENTO_MAESTRO.md` (1700+ líneas) -- este documento es el mapa técnico completo, no el diario.

## 1. Arquitectura y stack real

- **Monorepo**: npm workspaces + Turborepo. `apps/api` (NestJS), `apps/web` (Next.js App Router), `packages/db` (Drizzle ORM + PostgreSQL).
- **Capas del backend** (arquitectura hexagonal real, no solo nominal):
  - `presentacion/` -- controladores HTTP + DTOs con `class-validator`. Un módulo por dominio.
  - `aplicacion/` -- servicios, lógica de negocio real. Reciben el repositorio por interfaz (puerto), no la implementación concreta.
  - `dominio/` -- interfaces/puertos (`*.ports.ts`), tipos de dominio. Sin dependencias de infraestructura.
  - `infraestructura/` -- implementación real de acceso a datos (`*.repositorio.drizzle.ts`), notificaciones, cifrado, etc.
- **Frontend**: Next.js App Router, Tailwind, sin librería de estado global -- todo via `fetch` directo a la API (`apps/web/lib/api.ts`, ~1400 líneas, es el único punto de contacto con el backend).
- **Base de datos**: PostgreSQL. `drizzle-kit generate` está roto para este proyecto (confirmado, no reintentar) -- todas las migraciones se escriben a mano en `packages/db/migrations/NNNN_descripcion.sql`, numeradas secuencialmente, aplicadas con `packages/db/scripts/aplicar-migraciones.cjs` (idempotente, se puede correr repetido sin daño -- salta las ya aplicadas).
- **Despliegue real**: backend en Render (`https://columbus-backend.onrender.com`, plan gratuito -- se "duerme" tras inactividad, primer request tras dormir tarda 30-50s), frontend en Vercel (`https://columbus-frontend-two.vercel.app`). DB en Render PostgreSQL 16, expira ~6-sept-2026 sin plan de renovación confirmado todavía.

## 2. Seguridad multi-tenant (RLS) -- el mecanismo real completo

Aislamiento en 2 capas, documentado explícitamente en `packages/db/schema/rls.ts` (leerlo primero, tiene el razonamiento completo):

1. **Filtro de aplicación**: cada request autenticado resuelve `cooperativaId` del JWT, y lo aplica vía `SET LOCAL app.current_cooperativa_id` dentro de una transacción real (`infraestructura/database/tenant-transaction.ts`, función `ejecutarComoCooperativa`).
2. **Row-Level Security de Postgres**: capa redundante, protege incluso si hay un bug de aplicación. 2 roles reales: `ticketya_app` (sujeto a RLS, usado por requests normales) y `ticketya_platform_admin` (para el admin de plataforma, necesita ver todas las cooperativas).

**Limitación real crítica, ya documentada en el código**: la API `pgRole` de Drizzle (v0.45.x) no expone el atributo `BYPASSRLS`. En un Postgres administrado (Render), tampoco se le puede otorgar `BYPASSRLS` a un rol de aplicación de todas formas (solo un superusuario existente puede otorgarlo, y el usuario de conexión de la app nunca lo tiene ahí). **El patrón correcto real es una excepción explícita dentro de cada política**, nunca depender del atributo de rol:

```sql
current_user = 'ticketya_platform_admin' OR cooperativa_id = NULLIF(current_setting('app.current_cooperativa_id', true), '')::uuid
```

Este patrón vive como constante reutilizable en `rls.ts`: `filtroCooperativaActual` (para tablas donde TODA fila pertenece a una cooperativa) y `filtroCooperativaActualOGlobal` (para tablas que mezclan filas de tenant con filas globales sin dueño, ej. `usuarios` -- pasajeros no pertenecen a ninguna cooperativa).

**Hallazgo real de anoche, corregido pero vale la pena saber**: la tabla `ruta_paradas` (agregada 20-ago) inicialmente copió el patrón viejo y roto (listar el rol en el `TO` de la política, esperando que eso bastara) -- **nunca funciona** en Postgres administrado, exactamente el error que este archivo ya advertía. Se corrigió (migración `0040`), pero la política de `ruta_paradas` quedó con la lógica **escrita a mano inline**, no importando la constante `filtroCooperativaActual` -- funciona igual, pero es inconsistente con el resto del esquema y no se actualizaría automáticamente si el patrón cambia. Vale la pena refactorizarla para usar el import compartido.

**Verificación real**: existe `packages/db/verify_rls_isolation.cjs` en la raíz de `packages/db` -- script standalone para confirmar el aislamiento contra la BD real, fuera de la suite de Jest.

**Gotcha real documentado en el código**: `current_setting(x, true)` sobre un GUC personalizado no definido devuelve cadena vacía `''` tras un `RESET`, no `NULL` -- por eso todo filtro pasa por `NULLIF(..., '')` antes de castear a `uuid`. Sin esto, una conexión con la variable reseteada rompe con "invalid input syntax for type uuid" en vez de simplemente no ver filas.

**Tablas con RLS activado hoy** (confirmado, `pgPolicy` presente): `rutas`, `ruta_paradas`, `viajes` (en `rutas.ts`), tablas de `flota.ts`, `usuarios.ts`, `ventas.ts`, `api_externa.ts`, `asientos.ts`. **41 tablas existen en total** -- las que no están en esta lista (banners, comercial, liquidaciones, etc.) no tienen RLS propio; confirmar caso por caso antes de asumir aislamiento si se construye algo nuevo sobre ellas.

## 3. Zona horaria -- gotcha real que costó tiempo esta sesión

**La sesión de conexión de Postgres usa UTC**, no `America/Guayaquil`. Todas las columnas de hora (`horaSalidaProgramada`, `horaLlegadaEstimada`) son `timestamp({ withTimezone: true })` -- genuinamente `timestamptz`. Si se inserta un string sin offset explícito (ej. `'2026-08-24 06:00:00'`), Postgres lo interpreta como UTC, no como hora de Ecuador. **Esto causó un bug real esta noche**: 252 viajes de prueba se generaron con horas 5 horas antes de lo real, porque el script de generación insertó horas "locales" de Ecuador sin el offset `-05:00` explícito. Corregido con `UPDATE ... SET hora = hora + interval '5 hours'`, pero **cualquier inserción futura de horas debe usar el offset explícito** (`'2026-08-24 06:00:00-05:00'`) o convertir del lado de la aplicación antes de insertar, nunca asumir que el string se interpreta como hora de Ecuador.

## 4. Endpoints reales completos, por módulo (confirmado contra el código, no de memoria)

```
auth/           login, registro, refresh, 2fa/* (iniciar-configuracion, confirmar-configuracion,
                verificar, recuperar), perfil, perfil/identidad, perfil/foto, cambiar-password,
                eliminar-cuenta, verificar-correo, reenviar-verificacion, solicitar-reset,
                restablecer-password, solicitar-cambio-correo, confirmar-cambio-correo

busqueda/       viajes/buscar, viajes/:id/paradas, viajes/:id/ubicacion, puntos-operacion/buscar,
                puntos-operacion/aliadas, rutas-disponibles, banners-propios, contacto-soporte,
                estadisticas-publicas

ventas/         POST / (crear compra -- la raiz del controlador, @Post() sin ruta),
                boletos/:id/cancelar, boletos/:id/reprogramar, boletos/:id/solicitar-factura,
                pago-manual, :compraId, :compraId/comprobante, metodos-pago/:viajeId, mis-creditos

calificaciones/ mis-boletos, mis-boletos/:id/pdf, cooperativa/:id/resenas

wallet/         saldo, movimientos, cashback-porcentaje (GET+PATCH)

referidos/      mis-referidos, beneficios-publicos, configuracion (GET+PATCH)

asientos/       :numeroAsiento/bloquear

panelempresa/   rutas (CRUD), rutas/:id/paradas, paradas (CRUD), horarios-ruta (CRUD + estado),
                unidades (CRUD + estado), tipos-vehiculo (CRUD), conductores, viajes (CRUD +
                cancelar + cancelar-masivo + unidad), usuarios, configuracion-fiscal,
                configuracion-vip, politica-cancelacion-reprogramacion, horas-limite-reprogramacion,
                credenciales-api (CRUD + rotar + webhook), metodos-pago, pagos-pendientes
                (confirmar/rechazar), solicitudes-factura, liquidaciones, dashboard, perfil (+foto),
                validar-qr, verificar-menor, importar (carga masiva JSON), estado-datos,
                confirmar-datos, puntos-operacion (proponer)

admin/          cooperativas (CRUD), administradores (CRUD), puntos-operacion (CRUD + aprobar/
                rechazar + pendientes), banners-propios (CRUD), cargo-plataforma, iva-nacional,
                modo-iva-boleto, soporte, dashboard, usuarios/contador

comercial/      leads (crear + listar + editar), campanas (crear + listar + aprobar/rechazar +
                metricas + clic + impresion), espacios-publicitarios, planes-comerciales

api-externa/    PATCH viajes/:id/precio, PATCH viajes/:id/ubicacion, GET webhooks
                ** NO hay ningun endpoint de venta real -- ver seccion 6, hueco mas grande **

liquidaciones/  :id/pagar

generador-viajes/       0 endpoints HTTP -- job interno (cron/scheduled), no expuesto
notificaciones-programadas/  0 endpoints HTTP -- mismo caso
webhooks/       0 endpoints propios -- infraestructura de envio, no de recepcion
salud/          (health check estandar)
```

## 5. Autenticación -- detalles no obvios

- **2FA obligatorio** para `super_admin`, `admin_plataforma`, y `admin_cooperativa` (constante `ROLES_2FA_OBLIGATORIO` en `auth.service.ts`). Se desactiva completo si `NODE_ENV === 'test'` (necesario para que las decenas de pruebas e2e existentes no se rompan intentando resolver TOTP).
- **Flujo real de login con 2FA obligatorio, cuenta nueva** (nunca configurado): `POST /auth/login` devuelve `{ requiereConfigurar2fa: true, tokenTemporal }` (NO `accessToken`) → `POST /auth/2fa/iniciar-configuracion` con el `tokenTemporal` devuelve `{ secreto, qrDataUrl }` → generar TOTP real del secreto → `POST /auth/2fa/confirmar-configuracion` con `{ tokenTemporal, codigo }` devuelve recién ahí `{ accessToken, refreshToken, ...códigos de recuperación }`.
- **Login con 2FA ya activo**: `POST /auth/login` devuelve `{ requiere2fa: true, tokenTemporal }` → `POST /auth/2fa/verificar` con `{ tokenTemporal, codigo }`.
- El `tokenTemporal` dura 10 minutos, solo sirve para completar el segundo factor, nunca da acceso directo.
- TOTP generado con `otplib`-equivalente casero en `dominio/auth/auth.ports.ts` (`generarSecretoTotp`, `base32Encode`) -- estándar RFC 6238, HMAC-SHA1, 30s, 6 dígitos, compatible con cualquier app autenticadora real.

## 6. Hueco arquitectónico más grande -- API externa de ventas

Confirmado con evidencia directa: `VentasController` (el que sí vende boletos) **nunca** acepta `ApiKeyGuard`, solo `JwtAuthGuard`/`OptionalJwtAuthGuard` (sesión de pasajero). `ApiExternaController` (protegido con `ApiKeyGuard`, correcto para integraciones B2B) solo tiene 3 endpoints de sincronización de metadatos (precio, GPS, ver webhooks) -- **cero capacidad de venta real vía API**.

Comparado con el líder real del mercado (redBus): su API B2B real cubre búsqueda, mapa de asientos, compra completa, cancelaciones, comisión/markup por agente, reportes de conciliación -- todo lo que aquí falta. Esta es la pieza más grande pendiente, y la más alineada al objetivo declarado del dueño del proyecto (SaaS real, no solo plataforma propia).

## 7. Otros huecos reales confirmados

- **Carga masiva** (`POST /coop/importar`): funciona, pero el frontend (`/panel-empresa/carga-masiva`) es un `<textarea>` de JSON crudo -- no usable por personal no técnico. No existe plantilla Excel/CSV.
- **Paradas intermedias -- Fase 2**: se puede cargar y mostrar una parada intermedia (Fase 1, completa, con RLS verificado), pero no se puede comprar un boleto abordando en una parada intermedia -- solo desde origen/destino final de la ruta.
- **`campanasPublicitarias`** no tiene campo de URL de destino -- el clic se registra como métrica pero no navega a ningún sitio real del anunciante.
- **`distanciaKm`** (agregado 24-ago) no está expuesto todavía en `CrearRutaDto` del panel de cooperativa -- solo se puede cargar por script directo a la BD, no desde el formulario real de creación de ruta.
- **WhatsApp**: `SimuladorNotificadorWhatsApp` sigue activo en `notificaciones.module.ts` -- bloqueado por cuenta gratuita de Twilio, el código real (`TwilioNotificador`) ya existe, listo para activar cuando haya cuenta paga.
- **Horarios recurrentes**: el endpoint `POST /coop/horarios-ruta` existe, pero **no** dispara generación automática de viajes en el momento -- `generador-viajes` es un módulo sin endpoints HTTP (cron interno). Para poblar viajes de prueba masivos, se generaron directo por SQL esta sesión, no vía el mecanismo real de horarios recurrentes -- confirmar el comportamiento real del cron antes de asumir que un horario nuevo genera viajes inmediatos.

## 8. Testing -- patrones reales y gotchas

- **19 archivos**, **221 pruebas e2e** (Jest + Supertest), corren con `jest-e2e.json` (`maxWorkers: 1` -- deliberado, corren en serie, no en paralelo).
- **Gotcha real recurrente esta sesión completa**: `configuracion_plataforma.cargo_plataforma_por_pasajero_default` se queda sobrescrito entre corridas de pruebas (una prueba lo cambia a 0.55 y no lo revierte) -- rompe 5 pruebas de `checkout.e2e-spec.ts` con "Received: X.55" en vez del valor esperado. **Resetear a mano antes de correr la suite**: `UPDATE configuracion_plataforma SET cargo_plataforma_por_pasajero_default = 0`. Candidato real a corregir con un `afterEach`/`afterAll` en el archivo que lo ensucia.
- **Aislamiento por sufijo, no solo por nombre**: la mayoría de fixtures usan `const sufijo = Date.now()` para nombres únicos (`nombre: \`Origen ${sufijo}\``). **Desde el 21-ago, la búsqueda real filtra por CIUDAD, no por punto exacto** -- cualquier fixture nuevo que use un nombre de ciudad genérico (`'Machala'`, `'Guayaquil'`) sin el mismo sufijo choca con años de datos acumulados en la BD local de pruebas (nunca se limpia entre corridas manuales). Usar `ciudad: \`Machala ${sufijo}\`` en cualquier prueba nueva que dependa de búsqueda por ciudad.
- **Variable de entorno real necesaria para migraciones**: `DATABASE_URL_MIGRACIONES` -- nunca la misma que `DATABASE_URL` de la app, debe apuntar a un usuario con privilegios de crear roles/tablas/políticas. Local: `postgresql://postgres:progresista2026@localhost:5432/ticketya`. Sin esto, `npm run db:migrar` falla con mensaje explícito, no en silencio.

## 9. Cómo correr todo en local

```bash
npm install
cd packages/db
$env:DATABASE_URL_MIGRACIONES = "postgresql://postgres:progresista2026@localhost:5432/ticketya"  # PowerShell
node scripts/aplicar-migraciones.cjs
npm run build
cd ../..
npm run dev
```

Backend espera además: `JWT_SECRET`, credenciales de pasarelas (De Una, PayPhone) -- opcionales para desarrollo si no se prueba pago real, el checkout tiene camino de prueba sin pasarela real.

## 10. Regla de disciplina de este proyecto, vale la pena mantenerla

Todo cambio fusionado a `main` pasó por: `tsc --noEmit` limpio en el paquete tocado, `next build` completo (32/32 páginas) si toca frontend, y **toda** la suite de 221 pruebas e2e en verde -- no solo el archivo relacionado. Cada PR documenta en su mensaje de commit el hallazgo real que lo motivó y cómo se verificó. `DOCUMENTO_MAESTRO.md` tiene el registro completo, fechado, de cada decisión de producto y cada hallazgo técnico desde el inicio del proyecto -- útil como archivo de "por qué está así", no solo "qué hace".
