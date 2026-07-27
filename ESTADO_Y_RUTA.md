# Colombus — Documento de traspaso definitivo y completo

**Última actualización:** 27 de julio de 2026, sesión extendida (actualizado al cierre de cada sesión de trabajo real — este es un documento vivo, no una foto fija de un solo día)
**Propósito:** que una nueva conversación de Claude tenga TODO el contexto del proyecto, de principio a fin — qué es, qué existe, qué falta, y cómo se va a desplegar — sin tener que reconstruir nada de memoria ni repetir preguntas ya respondidas.

**Este documento reemplaza y consolida los traspasos anteriores** (`Colombus_Contexto_Traspaso.md`, `Colombus_Informe_de_Estado.md`, `Colombus_Auditoria_Verificada.md`, y `ESTADO_Y_RUTA.md` que vivía dentro del propio repo). Es la única fuente de verdad a partir de ahora.

**⚠️ Acción pendiente para el usuario:** existe un archivo `ESTADO_Y_RUTA.md` dentro de la carpeta del proyecto (`C:\Users\exitoso\Desktop\ticketya\ESTADO_Y_RUTA.md`, creado 23-jul-2026 por una sesión anterior) cuyo contenido útil ya se fusionó aquí el 27-jul. Recomendado: borrarlo o renombrarlo a `ESTADO_Y_RUTA_OBSOLETO.md` para que no compita como una segunda fuente de verdad desactualizada.

**Regla de mantenimiento:** este documento se actualiza al cierre de cada sesión real de trabajo (no solo cuando el usuario lo pide), para que Claude nunca vuelva a "perder el hilo" ni a repetirle al usuario información que ya corrigió antes.

---

## 1. Qué es Colombus, de principio a fin

Colombus es una plataforma SaaS para venta de pasajes de bus interprovincial en Ecuador. Nace en Machala (Terminal Terrestre de Machala, provincia de El Oro), con la intención explícita del usuario de expandirse a **todas las cooperativas y todas las ciudades y cantones del país**, no solo las principales — el usuario lo dijo desde la primera sesión: "aunque iniciemos en Machala vamos a hacer presencia en todos los rincones del país y con todas las cooperativas a nivel nacional en Ecuador."

**Nombre de marca:** Colombus (antes TicketYa). El usuario confirmó que necesita **logo/identidad visual real**, no solo texto estilizado — pendiente de diseño.

**Existen DOS artefactos de código, completamente separados, que no deben confundirse:**

| | Demo HTML | Software real |
|---|---|---|
| Archivo | `colombus-demo__2_.html` (un solo archivo autocontenido) | `apps/api` (NestJS) + `apps/web` (Next.js) + `packages/db` (Drizzle/Postgres) |
| Marca | Colombus ✅ | **TicketYa** (nunca rebrandeado — ver hallazgo crítico abajo) |
| Backend real | No — todo simulado en JS del navegador | Sí, con base de datos Postgres real |
| Propósito | Pitch visual a inversionistas/cooperativas | Producto de producción |
| Despliegue | **Ya resuelto** (Netlify, ver sección 4) | **Decidido, sin ejecutar** (Render+Vercel, ver sección 4) |

---

## 2. Hallazgo crítico que no debe olvidarse

**El software real todavía dice "TicketYa" en el código de producción** (`apps/web/app/page.tsx`, literal: `<span>TicketYa</span>` y `¿Por qué TicketYa?`). El rebrand a Colombus **solo se aplicó al demo HTML**. Nadie ha tocado el código real con ese cambio. El usuario ya confirmó que el nombre real es Colombus — **esto sigue pendiente de ejecutar en `apps/web`** cuando se retome el desarrollo del software real.

Además, la landing del software real es mucho más simple que la del demo HTML (hero + buscador + 3 tarjetas + franja de banners, sin mapa de asientos visual, sin destinos, sin cooperativas, sin publicidad real todavía). Son diseños completamente distintos hoy.

---

## 3. Estado auditado del software real — verificado archivo por archivo, no de memoria

Esta sección viene de una auditoría real: el usuario pegó el contenido de sus propios archivos (controllers, esquemas de base de datos, cliente API, páginas) directamente en esta conversación, y se verificó cada uno.

### 3.1 Backend (`apps/api`) — 7 controllers, ~40 endpoints, 100% auditado
`auth`, `busqueda`, `asientos`, `ventas` (`/compras`), `calificaciones`, `panelempresa` (`/coop`, 25 endpoints), `admin` (`/admin`). Todos verificados línea por línea. 88/88 tests e2e pasando, commit `695a510`, repo limpio (`git status` confirmado en vivo por el usuario).

### 3.2 Base de datos — 18 archivos de esquema (41 tablas en total, confirmado en `ESTADO_Y_RUTA.md`), cruzados contra los controllers
**Módulos con esquema Y lógica real (funcionan de punta a punta):** Auth, Rutas/Viajes, Asientos, Ventas/Boletos, Menores de edad, Panel Empresa (flota+personal+conductores), Panel Admin, Calificaciones.

**Módulos que son SOLO esquema — cero endpoint, cero lógica construida encima:**
- **Facturación electrónica SRI** (`comprobantes_tasa_terminal`, `comprobantes_electronicos`)
- **Liquidaciones** (`liquidaciones_cooperativa`, `liquidaciones_terminal`, `ajustes_liquidacion` — con `CHECK` de integridad real en SQL, buen diseño previo)
- **Comercial/Publicidad real (RF-COMM)** — espacios, planes, leads, campañas, métricas. **Cero endpoints.** Todo lo publicitario que existe hoy es únicamente la maqueta visual del demo HTML
- **API externa Modelo B** (credenciales, webhooks, reservas)

**Módulo parcialmente implementado (actualizado 27-jul):**
- **Notificaciones** — ya no es solo esquema. `confirmacion_compra` funciona de punta a punta (correo simulado, ver sección 7). `recordatorio_viaje` y `cambio_operativo` (los tipos que requieren disparo automático sin acción del usuario, no como reacción a un checkout) siguen sin construir.

**Pagos:** 100% simulados (`infraestructura/pagos/simulador.pasarela.ts`). La tabla `pagos` ya soporta cualquier proveedor e idempotencia real, pero nada está conectado.

**Recuperación de contraseña:** ✅ construida el 27-jul (ver sección 7) — ya no es pendiente.

**Descubrimiento nuevo:** existe `ruta_paradas` (Fase 2) pensada para comprar solo hasta una parada intermedia — solo esquema, sin lógica ni pantalla.

### 3.3 Frontend real (`apps/web`)
`lib/api.ts` cubre exactamente los ~40 endpoints auditados, sin huecos. `FranjaBanners.tsx` es real y funcional: consume el endpoint público de banners propios, se auto-oculta si no hay banners activos — pero esto es solo promoción interna (DevX, Surebets24/7, el propio terminal), **no** el sistema comercial de terceros (RF-COMM), que confirmamos que no tiene backend.

---

## 4. Despliegue — lo que ya está resuelto y lo que NO

Esta es la pregunta que el usuario hizo explícitamente para este traspaso. Aquí la respuesta honesta, dividida en lo que sí existe y lo que no.

### 4.1 Demo HTML — despliegue YA resuelto y probado
El demo es un único archivo autocontenido (HTML+CSS+JS, sin build step, fuentes vía Google Fonts CDN). El flujo de despliegue ya usado y documentado en sesiones anteriores:
- Se renombra a `index.html` y se sube directo a **Netlify Drop** (`https://app.netlify.com/drop`), o
- Se empaqueta en un `.zip` junto a un `netlify.toml` con configuración de headers de seguridad (`X-Frame-Options`, `X-Content-Type-Options`) y redirect a `index.html`.
- No requiere cuenta para el primer despliegue; se recomienda crear cuenta gratis para poder editarlo después.
- Puede conectarse un dominio propio (ej. `colombus.ec`) después, desde el panel de Netlify.
- Advertencia ya comunicada al usuario en su momento: el demo funciona todo en el navegador (búsqueda, selección de asiento, pago, boleto QR) pero con datos simulados — no hay servidor real detrás.

**No hace falta redefinir esto** — ya funciona y está probado. Si se necesita volver a desplegar la versión actual del demo, el mismo flujo aplica.

### 4.2 Software real — despliegue YA DECIDIDO, pendiente de ejecutar

**Corrección importante respecto a versiones anteriores de este documento:** se afirmó antes que el despliegue del software real no estaba definido. Eso era incorrecto — el usuario compartió un informe propio ("TicketYa — Informe de Arquitectura, Despliegue y Decisiones Técnicas", 21-jul-2026) que ya contiene la decisión, tomada con justificación técnica real (se evaluó y descartó explícitamente una alternativa con Supabase + Redis/Upstash + scanner offline-first, por riesgos concretos de doble fuente de verdad y fraude de validación).

**Decisión de despliegue:**
- **Frontend (Next.js):** Vercel
- **Backend (NestJS) + Base de datos (PostgreSQL):** Render (elegido sobre Railway por estabilidad — Railway registró 5 caídas documentadas desde nov-2025, incluyendo 8h de apagón en mayo-2026)
- **Envío de boletos/notificaciones:** Resend (email) o Twilio (WhatsApp)
- **Costos proyectados:** ~$13-14/mes en el piloto, ~$45-70/mes en operación real con más tráfico
- **Volumen objetivo:** 25% del flujo del Terminal de Machala = 325,000 pasajes/año, picos de 45,000 peticiones/día en feriados (~1.5 req/s promedio, ~15 req/s pico) — un solo servidor + Postgres estándar lo resuelve sin arquitectura compleja
- **Multi-tenancy real ya verificado en vivo:** RLS por transacción confirmado con pruebas reales de que una cooperativa no puede ver datos de otra
- **Camino a escala nacional/multi-país ya contemplado en el diseño:** tasas por terminal sin cambio de código al agregar uno nuevo, IVA configurable por cooperativa pensando en reglas fiscales de otros países, backend sin estado para escalar horizontalmente

**Lo que SIGUE sin hacer (la decisión está tomada, la ejecución no):**
1. Ningún Dockerfile ni configuración de Render/Vercel existe todavía en el repo
2. Hoy el backend y Postgres solo corren en `localhost` (confirmado viendo el `.env` real del usuario — `DATABASE_URL=postgresql://...@localhost:5432/ticketya`)
3. No hay separación de entornos (dev/staging/producción) todavía
4. No se ha ejecutado ningún deploy real a Render ni a Vercel

**Cuándo ejecutar esto:** según el orden de fases acordado, la ejecución del despliegue va DESPUÉS de que la funcionalidad del backend esté más completa (ver Fase de trabajo en sección 10) — no bloquea el trabajo actual.

---

## 5. El módulo de publicidad — análisis y plan ya definido (pendiente de construir)

El usuario preguntó explícitamente cómo se manejaría la publicidad real. Ya se le dio una respuesta completa como experto en ad-tech, resumida aquí para no repetirla:

**Arquitectura correcta:** la publicidad **nunca** debe vivir hardcodeada en el código — debe gestionarse desde un panel (ya modelado en `comercial.ts`: `espacios_publicitarios`, `planes_comerciales`, `campanas_publicitarias`, `metricas_publicitarias`) y servirse a la landing vía un endpoint público dinámico, igual que ya funciona `listarBannersActivos()` para los banners propios. Cambiar una campaña = acción de negocio en el panel, cero código, cero despliegue.

**Qué necesita una marca para querer pautar:** alcance/tráfico real medible, perfil de audiencia (viajeros con intención de compra real por ruta), reporte de impresiones/clics (ya modelado), tarifario claro por plan, y prueba social (1-2 marcas reales pautando, aunque sea gratis al inicio a cambio de testimonio).

**La verdad incómoda pero necesaria sobre "generar interacción":** no hay atajo técnico. El tráfico real viene de que el producto resuelva el problema de comprar boletos, no al revés. El orden correcto es: producto útil → tráfico real → ese tráfico tiene valor para vender.

**Pendiente de construir (nadie lo ha empezado):** pantallas del Panel Admin para gestionar espacios/campañas/planes, endpoints CRUD, endpoint público de campañas activas por espacio, dashboard de métricas.

---

## 6. Demo HTML — estado visual y lo que aún falta

Ya se resolvió: rebrand completo a Colombus (logo, footer, paneles internos — verificado sin ningún "TicketYa" residual), paleta rojo/negro/dorado, publicidad redistribuida en formatos variados (nativo, video simulado, vertical, leaderboard) en vez de amontonada, hero con imagen de fondo de bus, buscador en proceso de rediseño a barra horizontal alargada.

**Pendiente puntual en el demo:**
- Confirmar que la foto del hero se vea "supermoderna" (la actual es una foto libre genérica, funcional pero mejorable)
- Terminar el rediseño del buscador a una sola fila horizontal con el selector de pasajeros como panel flotante
- Revisar las ~20 capturas de referencia visual que el usuario subió (16-22 de julio) antes de cualquier ajuste visual nuevo — probablemente reflejan apps competidoras o direcciones ya discutidas
- El usuario mencionó que compartiría imágenes puntuales de lo que busca para la landing — pedírselas si no llegan de una vez

---

## 7. Orden de trabajo acordado y avance real de construcción

**Regla acordada con el usuario (importante, cambia el orden de todo lo demás):** funcionalidad backend al 100% primero. El frontend (`apps/web`) se deja para el final — ni rebrandeo ni diseño visual se tocan hasta que el backend esté completo y probado. Esto incluye NO construir el módulo de "trayecto en Maps" como pantalla todavía, solo la función de backend que lo soporta (ver más abajo).

### Fase 1 — Huecos pequeños: ✅ COMPLETA (26-jul-2026)
Construida, probada dos veces (88/88 tests e2e) y en GitHub:
- `PATCH /coop/tipos-vehiculo/:id` — editar/desactivar, bloqueado si hay boletos vigentes que dependan de la capacidad/distribución de asientos
- `PATCH /coop/rutas/:id` — editar/desactivar, sin restricciones (el precio del viaje ya es una copia congelada, no se ve afectado)
- `GET /compras/:compraId` — recibo completo de una compra (totales, estado de pago, detalle de cada boleto con pasajero/asiento/ruta/QR)
- Commits: `e6b5acb` (rutas/tipos vehículo), `46d6e40` (recibo de compra)

### Extra — Coordenadas de origen/destino en búsqueda: ✅ COMPLETA (27-jul-2026)
Para soportar a futuro un botón "Ver trayecto en Maps" en el frontend (idea del usuario): `buscarPuntosOperacion` y `buscarViajes` ahora devuelven `latitud`/`longitud` de cada punto de operación (usando `alias()` de Drizzle para el doble-join de origen y destino). Probado, 88/88 tests. Commit `2605f21`. **Falta:** cargar coordenadas reales de cada terminal (ver limpieza de datos abajo) y construir el botón en frontend cuando llegue esa fase.

### Recuperación de contraseña: ✅ COMPLETA (27-jul-2026)
`POST /auth/solicitar-reset` y `POST /auth/restablecer-password` — token real generado con `crypto.randomBytes`, guardado como hash SHA-256 (no el token en texto plano) en `tokens_usuario`, expira en 30 min, un solo uso. Responde siempre `{ok:true}` exista o no el correo (no revela qué correos están registrados). El envío real de correo queda simulado (`SimuladorNotificador`, imprime en consola) hasta conectar Resend al final — mismo patrón que `simulador.pasarela.ts` para pagos. 7 archivos, incluye un archivo nuevo (`infraestructura/notificaciones/simulador.notificador.ts`) y 2 DTOs nuevos. Probado, 88/88 tests. Commit `40235cd`.

### Notificación automática de compra confirmada: ✅ COMPLETA (27-jul-2026)
Al confirmar un pago en el checkout, se registra una fila en `notificaciones` (tabla que antes era solo esquema, ahora tiene uso real) y se llama al mismo `NotificadorEmail` construido para recuperación de contraseña (se le agregó `enviarConfirmacionCompra`) — reutilizado entre módulos exportando `NOTIFICADOR_EMAIL` desde `AuthModule` e importándolo en `VentasModule`. Un fallo de notificación nunca revienta ni deshace la venta ya aprobada (try/catch, se marca `'fallido'` y sigue). **Bug real encontrado y corregido en el proceso:** el helper de limpieza de tests (`test/helpers/limpieza.ts`) no borraba `notificaciones` antes de `compras`, causando fallo de llave foránea al final de `checkout.e2e-spec.ts` y `calificaciones.e2e-spec.ts` — corregido agregando el `DELETE` en el orden correcto. 8 archivos, probado, 88/88 tests. Commit `10f9f7d`.

### Limpieza de datos de prueba — ✅ COMPLETA (27-jul-2026)
Se detectaron y eliminaron 2 registros falsos que habían quedado de pruebas anteriores en `puntos_operacion` ("Terminal Terrestre Machala RED", "Terminal de Prueba"), incluyendo una compra/boleto/pago de prueba ("Pasajero Red Uno") que dependía de uno de ellos — se borró la cadena completa en el orden correcto (pagos → boletos → comprobantes → pasajeros_compra → compras → puntos_operacion). **Lección aprendida:** antes de reportar datos de la base como reales, verificar si son de prueba — este error ya se había cometido una vez (reportar los 2 terminales falsos como si fueran reales).

**Corrección de Quito:** tenía un solo terminal genérico mal nombrado — se renombró a "Terminal Terrestre Quitumbe" y se agregó "Terminal Terrestre Carcelén" como el segundo terminal real de la ciudad.

**Cobertura nacional cargada:** se agregaron 22 ciudades más (todas con `tipo='terminal_terrestre'`), cubriendo Costa, Sierra y Oriente. Total actual: 26 puntos de operación (25 ciudades, Quito con 2 terminales). Nombres de terminal siguen el patrón "Terminal Terrestre de [Ciudad]" salvo Machala, Quitumbe y Carcelén (nombres reales confirmados). **Provincias asignadas por conocimiento geográfico general, no verificadas una por una contra fuente oficial — si alguna está mal, corregir según se detecte.**

**Pendiente de esto:** cargar `latitud`/`longitud` reales de cada terminal (el usuario debe sacarlas de Google Maps, clic derecho sobre el edificio exacto — no solo el centro de la ciudad) y, si aplica, registrar oficinas propias de cooperativas específicas (ej. "Panamericana tiene oficina en la Colón, Quito" — el esquema ya soporta esto vía `puntos_operacion.tipo='oficina_agencia'` + `cooperativaPropietariaId`, no requiere cambio de esquema).

### Siguiente en la fila (no iniciado)
1. Liquidaciones
2. Facturación electrónica SRI
3. Módulo comercial/publicidad real
4. Pagos reales con Kushki
5. Ejecutar despliegue a Render/Vercel (decisión ya tomada, ver sección 4.2)
6. Frontend completo (rebrand + diseño)

### Cómo levantar el proyecto en local (de `ESTADO_Y_RUTA.md`, fusionado aquí el 27-jul)
```powershell
# Terminal 1 — backend
cd C:\Users\exitoso\Desktop\ticketya\apps\api
npm run start:dev

# Terminal 2 — frontend
cd C:\Users\exitoso\Desktop\ticketya\apps\web
npm run dev
```
Frontend normalmente en `http://localhost:3001` (el 3000 lo ocupa el backend).

### ⚠️ Paso obligatorio después de CUALQUIER migración de esquema
```powershell
cd packages\db
npx tsc -p tsconfig.build.json
```
Si no se hace esto, el backend no reconoce columnas/tablas nuevas aunque la migración SQL ya se haya aplicado en pgAdmin. **Este paso no se mencionó en ningún momento durante el trabajo de hoy — revisar si hizo falta para los cambios de esta sesión.**

### Cuentas de prueba (en la máquina del usuario)
| Rol | Correo | Contraseña |
|---|---|---|
| Admin de plataforma | `director.demo@ticketya.ec` | `Demo12345` |
| Admin de cooperativa | `coop.demo@ticketya.ec` | `Demo12345` |

### ⚠️ Patrón recurrente: acumulación de datos de prueba sucios
**Esto NO es la primera vez.** El 22-23 de julio ya se había detectado y limpiado manualmente una acumulación de ~250 registros de prueba en la base de datos real, incluyendo confusión de terminales duplicados — el mismo tipo de problema que se volvió a encontrar y limpiar el 27-jul (ver arriba). Causa raíz documentada entonces: los archivos de test no siempre limpian de verdad lo que crean en su `afterAll` (`apps/api/test/helpers/limpieza.ts` existe para esto, pero hay que verificar que todo test nuevo lo use correctamente). **Recomendación:** antes de reportar cualquier dato de la base como "real", asumir que podría ser basura de prueba hasta confirmar lo contrario.
- Nunca pegar bloques largos de código para que el usuario los busque/pegue a mano — el usuario está aprendiendo y esto generó frustración real. En su lugar: (a) comandos PowerShell de una sola pieza con `.Replace()` de texto exacto cuando el cambio es simple, o (b) un archivo `.ps1` descargable que el usuario solo ejecuta, cuando el cambio involucra backticks de SQL/Drizzle que la terminal interpretaría mal.
- Verificar cada `-replace`/`.Replace()` con un `Select-String` inmediato después, y si el resultado pegado por el usuario se ve sospechoso (falta una línea de cierre, una llave, un paréntesis), **pedir ver el bloque completo del archivo real antes de asumir que está roto o que está bien** — varias veces el problema era solo que el copy-paste del chat se "comía" una línea visualmente, no que el archivo real estuviera mal.
- Correr `npm run test:e2e` después de cada bloque de cambios, nunca acumular varios cambios sin probar entre medio.
- Comitear y subir a GitHub al cierre de cada bloque de funcionalidad cerrada, no acumular cambios sin respaldar.
- Para cambios en base de datos con riesgo de llaves foráneas (`DELETE`/`UPDATE`), dar **un solo paso SQL a la vez**, nunca varios bloques seguidos — el usuario pidió esto explícitamente tras confundirse con pasos encadenados.

---

## 8. Reglas de trabajo obligatorias (aprendidas a pulso en esta conversación)

1. **No modificar código hasta que el requerimiento esté 100% definido y aprobado explícitamente por el usuario** — instrucción directa suya, vigente.
2. **Partir siempre del archivo real más reciente que el usuario suba** — nunca reconstruir desde cero un archivo que ya existe.
3. **Verificar con comandos reales antes de declarar algo resuelto** — no asumir que un `sed`/reemplazo capturó el 100% de los casos; el usuario ya encontró dos veces restos de "TicketYa" que un primer pase no detectó.
4. Ante la duda sobre el estado real del código, **pedir al usuario que pegue el contenido real de los archivos** (o suba un `.zip` limpio sin `node_modules`/`.env`) en vez de reportar de memoria.
5. Antes de escribir código, revisar los `SKILL.md` relevantes en `/mnt/skills/public/`.
6. Verificar licencia libre y ausencia de marcas/personas reales antes de insertar imágenes; usar Wikimedia Commons vía `Special:FilePath/<archivo>` como método verificado.
7. El usuario corrige con dureza cuando algo no cumple lo pedido — no es mala fe, es un proyecto del que depende su sustento. Tomarlo en serio, sin actitud defensiva.
8. Cuando el usuario exprese que se siente perdido o desconfiado del progreso, **la respuesta correcta es auditar con evidencia real, no repetir un resumen tranquilizador.**

---

## 9. Decisiones de negocio aún pendientes (no técnicas)

- % de comisión final de la plataforma (referencia $0.50 fijo, no confirmado oficialmente)
- Cotización real con Kushki para "Comisiones a Terceros" (split de pago cooperativa + plataforma)
- Tasa real del terminal de Machala para el piloto
- Política de reembolso al cancelar viaje, una vez haya pagos reales
- Coordenadas reales (lat/lng) de cada terminal — tarea del usuario, vía Google Maps
- Confirmar nombres oficiales exactos y provincias de los 22 terminales cargados el 27-jul (se usó el patrón "Terminal Terrestre de [Ciudad]" sin verificar cada uno individualmente)

---

## 10. Resumen de una línea para arrancar rápido

*Colombus (antes TicketYa) es una plataforma de venta de pasajes de bus interprovincial en Ecuador, con vocación de cobertura nacional completa (26 puntos de operación cargados en 25 ciudades). Software real (NestJS+Next.js+Postgres) con backend en construcción activa siguiendo "funcionalidad primero, frontend al final": Fase 1 completa, coordenadas para Maps, recuperación de contraseña, y notificación automática de compra confirmada — todo probado (88/88 tests, seis rondas seguidas) y en GitHub (commit `10f9f7d`). El despliegue a producción YA está decidido (Render + Vercel) pero aún no ejecutado — sigue en localhost. Aún dice "TicketYa" en `apps/web`, pendiente de rebrand en la fase de frontend. Existe además un demo HTML de pitch, ya rebrandeado a Colombus, con Netlify resuelto, en proceso de pulido visual. Siguiente paso técnico: liquidaciones, facturación SRI, módulo comercial, o pagos con Kushki — en ese orden.*
