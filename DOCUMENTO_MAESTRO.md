# Columbus (TicketYa) — Documento Maestro de Requerimientos y Estado Real

**Última actualización:** 2 de agosto de 2026 — corrección de sincronización: se documenta el progreso real de Modelo B (esquema corregido, decisiones de diseño y de negocio cerradas) que se había discutido pero no se había escrito antes de avanzar a otra pieza. Se corrige también la numeración de la hoja de ruta, que se reiniciaba en cada fase en vez de continuar. El análisis original (secciones 3.1 a 3.13 + requerimientos no funcionales) sigue siendo la referencia completa; a partir de aquí, cada sección se actualiza a "cerrado" apenas se construye y verifica — antes de avanzar a la siguiente pieza, no después.

**Propósito de este documento:** ser la ÚNICA fuente de verdad del proyecto. Antes de escribir código, se consulta este documento. **Regla reforzada (2-ago-2026): ninguna construcción nueva empieza sin que la decisión ya esté escrita aquí y confirmada — se escribe primero, se confirma, y recién ahí se construye.** Ningún resumen de conversación reemplaza esto.

**Cómo está organizado:** cada sección funcional tiene tres partes — (1) qué DEBE hacer (el requerimiento completo, sin importar si ya existe), (2) el estado real verificado, (3) qué falta exactamente. Al final, la hoja de ruta por fases sale de comparar (1) contra (2).

---

## 1. Visión y alcance del proyecto

**Qué es:** una plataforma SaaS de venta de pasajes de bus interprovincial para Ecuador, donde cooperativas de transporte independientes se registran y venden sus propios pasajes, y la plataforma cobra un cargo fijo por boleto vendido (no un porcentaje de comisión).

**Origen:** nace en Machala (Terminal Terrestre de Machala, provincia de El Oro).

**Alcance declarado por el dueño del proyecto:** cobertura nacional completa — todas las cooperativas, todas las ciudades y cantones del Ecuador, no solo las rutas principales.

**Modelo de negocio:**
- La cooperativa recibe el 100% de la tarifa del pasaje + 100% de la tasa de uso de terminal (andén)
- La plataforma cobra un cargo fijo configurable por boleto vendido (ej. $0.50), no un porcentaje
- Cada cooperativa es responsable de su propia relación tributaria con el SRI por la tarifa que vende — la plataforma solo declara su propio cargo de servicio

**Dos artefactos de código que NO deben confundirse:**
| | Demo HTML de pitch | Software real (este documento se refiere a este) |
|---|---|---|
| Propósito | Presentación visual a inversionistas/cooperativas | Producto de producción |
| Backend real | No, todo simulado en el navegador | Sí, NestJS + PostgreSQL real |
| Estado | Rebrandeado a "Columbus", desplegado en Netlify | Aún dice "TicketYa" en el código, sin desplegar |

**Nombre de marca real del proyecto:** Columbus. **Pendiente:** el software real (`apps/web`) todavía usa el nombre "TicketYa" en el código — no se ha aplicado el rebrand ahí.

---

## 2. Actores del sistema

| Actor | Rol |
|---|---|
| **Pasajero** | Busca, compra, paga, gestiona sus propios boletos |
| **Cooperativa (admin_cooperativa)** | Administra su flota, rutas, viajes, personal, precios, métodos de pago, políticas propias |
| **Vendedor de cooperativa** | Rol operativo limitado dentro del panel de cooperativa (venta en ventanilla, validación de boletos) |
| **Administrador de plataforma (admin_plataforma)** | Administra cooperativas, terminales, configuración global, comercial/publicidad, liquidaciones |
| **Anunciante** | Externo — contrata espacios publicitarios en la landing (vía leads) |

---

## 3. Análisis funcional completo, por módulo

### 3.1 Autenticación y cuentas

**Requerimiento completo:** registro con verificación de correo, login, recuperación de contraseña, cambio de contraseña, cambio de correo (con verificación en ambos correos), refresh tokens, roles diferenciados, 2FA para cuentas administrativas.

**Estado real:** ✅ Completo. 2FA: backend cerrado 06-ago-2026 (PR #47), frontend pendiente -- ver detalle en sección de requerimientos no funcionales.
- Registro con verificación real de correo (token, expira, un solo uso)
- Login, recuperación de contraseña (token con hash SHA-256, expira 30 min)
- Cambio de correo con flujo de doble verificación (correo viejo sigue activo hasta confirmar el nuevo)
- Refresh tokens reales
- Roles: pasajero, vendedor, admin_cooperativa, admin_plataforma

**Falta:** nada de autenticación base. 2FA: ver sección de requerimientos no funcionales.

### 3.1.1 Perfil del pasajero — análisis a profundidad (30-jul-2026)

**Requerimiento completo, analizado a fondo:**

**Perfil profesional, no una red social.** El panel "Mi cuenta" existe (datos, boletos, créditos), pero le falta una regla que sí importa: **no todo dato debe poder cambiarse a cualquier hora**. Comparado con cómo lo resuelven plataformas serias de identidad/viajes (aerolíneas, bancos): los campos que identifican legalmente a la persona (nombre completo, número de documento) se protegen con más fricción que los campos cosméticos (foto, teléfono, contraseña).

**Regla propuesta, a definir contigo antes de construir:**
| Campo | ¿Se puede cambiar libremente? |
|---|---|
| Foto de perfil, WhatsApp | Sí, sin límite — son datos de contacto/cosméticos |
| Contraseña | Sí, sin límite — es seguridad, no identidad |
| Nombre completo, cédula/documento | **No** — requiere límite de frecuencia (ej. una vez cada 90 días) o incluso verificación adicional, porque afecta la validez de boletos ya comprados a ese nombre y previene fraude de identidad |
| Correo | Ya tiene su propio flujo de doble verificación — correcto, no cambiar |

**Código de seguridad / identificación del pasajero — confirmado con el usuario (30-jul-2026), no es el mismo QR del boleto.**

El QR de boleto ya funciona exactamente así: nace con el pago (se genera al confirmarse la compra) y muere con el abordaje (al escanearlo el vendedor, el boleto pasa a "usado" y ese QR ya no sirve). Confirmado como correcto, sin ambigüedad.

Lo que se propone es distinto y adicional, no un reemplazo: un identificador **fijo, ligado a la cuenta desde el registro**, no a cada compra. Patrón real de plataformas serias (tarjetas de fidelidad de aerolíneas, carnets digitales):
- Verificación rápida de identidad en terminal, incluso sin tener el boleto a mano
- Base para un futuro programa de fidelidad/millas por viajes frecuentes
- Reduce fraude de suplantación al validar en el andén (el vendedor ve nombre + foto + historial, no solo un código de boleto suelto)

**Propuesta concreta:** un "código de pasajero" único y permanente (formato corto, ej. `COL-4X9K2P`), mostrado como QR en el perfil, escaneable por el personal de cooperativa para ver identidad + boletos vigentes de esa persona — complementa el QR de boleto, no lo reemplaza.

**Estado real:** ✅ Completo, cerrado 03-ago-2026 -- perfil base + código de pasajero + límite de frecuencia, todo construido y verificado.
- Código de pasajero: formato `COL-XXXXXX`, generado de forma perezosa (lazy) en `GET /auth/perfil` -- no en el registro, así los usuarios que ya existían antes de este cambio también terminan con uno, sin backfill manual. Permanente, ligado a la cuenta, distinto del QR de boleto
- Mostrado como QR en el perfil (`/perfil`), en la tarjeta de identidad
- Límite de 90 días: endpoint separado `PATCH /auth/perfil/identidad`, exclusivo para nombre completo y cédula/documento -- `PATCH /auth/perfil` (teléfono/foto) ya no acepta nombreCompleto, sin límite
- Regla de negocio pura `puedeEditarIdentidad()`: rechaza con 400 y los días restantes exactos si el límite no se cumple todavía
- Frontend: formulario de identidad deshabilitado y con mensaje claro durante el período de espera

**Decisión de negocio confirmada (director, 03-ago-2026), alcance construido:**
- Código de pasajero fijo y permanente, ligado a la cuenta desde el registro (no al boleto individual)
- Formato corto tipo `COL-4X9K2P`, mostrado como QR en el perfil
- Límite de frecuencia SOLO para nombre completo y cédula/documento: una vez cada 90 días
- Foto, WhatsApp y contraseña: sin límite, se mantienen como están hoy

**Falta:** nada. Verificado: `tsc` backend y frontend limpios, 137/137 pruebas e2e, `next build` 27/27 páginas, PR #27 fusionado a `main` con CI en verde.

---

### 3.2 Búsqueda y descubrimiento de viajes

**Requerimiento completo:** buscar por origen/destino/fecha, ver resultados con precio/asientos disponibles/cooperativa/tipo de vehículo, ver ubicación de terminales en mapa, filtrar por categoría de vehículo.

**Estado real:** ✅ Completo en lo básico.
- Búsqueda de puntos de operación y viajes
- Resultados con `asientosDisponibles`, categoría de vehículo, precio
- Coordenadas lat/lng ya se devuelven en la búsqueda (para un futuro botón "ver en Maps")
- 26 puntos de operación cargados en 25 ciudades del país (cobertura nacional inicial)

**Análisis a profundidad (30-jul-2026) — comparado contra 6 fuentes reales sobre lo que exige la industria hoy (redBus, Busbud, guías de desarrollo de plataformas de venta de boletos 2026):**

Todas las fuentes coinciden en el mismo set de expectativas mínimas que hoy **no tenemos**:
- **Filtros de búsqueda**: hoy los resultados se muestran, pero no hay forma de filtrar por rango de hora de salida, tipo de vehículo, o comodidades (WiFi, aire acondicionado, cargadores) — solo se ve la lista completa
- **Comodidades del vehículo (amenidades) -- cerrado 05-ago-2026 (PRs #38 backend, #39 frontend).** Catálogo cerrado (decisión del director 30-jul-2026): WiFi, aire acondicionado, baño a bordo, cargadores, asientos reclinables, TV. Campo `amenidades[]` en `tipos_vehiculo`, visibles en resultados de búsqueda, no solo guardadas en la base de datos.
- **Calificación visible antes de comprar -- cerrado 05-ago-2026 (PR #40).** Investigado primero: el promedio y el conteo YA se calculaban y YA se mostraban en los resultados de búsqueda (construido antes de esta sesión) -- el hueco real no era "no se muestra", era que se mostraba SIN ningún mínimo de confianza. Confirmado con datos reales de la base de desarrollo: ninguna cooperativa tenía más de 1 calificación al momento de decidir esto. Umbral mínimo de 5 calificaciones (mismo criterio que Google/Amazon) antes de mostrar promedio o conteo -- por debajo del umbral, ninguno de los dos aparece, ni siquiera un aviso de "pocas reseñas". Cambio quirúrgico de un solo archivo backend (`busqueda.service.ts`) -- el frontend ya ocultaba la insignia completa cuando el promedio es `null`, así que no necesitó ningún cambio.
- **Seguimiento en vivo del bus (GPS) -- backend cerrado 05-ago-2026 (PR #46), frontend bloqueado por API key de Google Maps, no por desarrollo.** Ver detalle completo abajo.

**Decisiones del director (30-jul-2026):**
- Filtros de búsqueda -- **cerrado 05-ago-2026 (PRs #38, #39).** Hora de salida (rango) y amenidades (AND, no OR) construidos y expuestos en el frontend. Tipo de vehículo: el backend lo soporta (`tipoVehiculoId`), pero **no se expuso en esta pantalla** -- no existe un catálogo global de tipos entre cooperativas para poblar ese filtro antes de buscar (cada cooperativa nombra los suyos distinto), decisión de alcance reportada, no un olvido. Precio: no estaba en el alcance que ordenó el director para este ítem, queda fuera de esta entrega.
- Amenidades del vehículo: **✅ aprobado**, catálogo cerrado (WiFi, aire acondicionado, baño a bordo, cargadores, asientos reclinables, TV) — no texto libre, mismo criterio que categoría de vehículo
- Calificación promedio visible en resultados de búsqueda: **✅ aprobado**, mejor relación esfuerzo/impacto de toda esta lista — el dato ya existe, solo falta exponerlo
- Seguimiento GPS en vivo: **corregido** — misma lógica del "cableado vs conector" que se corrigió en el Modelo B. Ver detalle abajo, no queda simplemente pausado.

**Aclaración importante (30-jul-2026):** existen dos funciones distintas relacionadas con mapas, que no deben confundirse:
- **Ver trayecto (terminal origen → terminal destino, ruta fija en un mapa)**: **✅ aprobado**, costo bajo — ya se guardan las coordenadas de cada terminal, solo falta el botón en frontend que abra el mapa con esos dos puntos. No depende de ningún hardware de la cooperativa.
- **Seguimiento en vivo (dónde está el bus en este momento exacto, moviéndose)**: separar lo genérico de lo específico, igual que en Modelo B —
  - **El cableado (✅ construir ya):** un endpoint que reciba una ubicación GPS y la guarde, y un mapa en el frontend que la muestre en vivo — esto es genérico, funciona igual sin importar qué cooperativa lo use algún día
  - **El conector (⏸️ sí espera):** que una cooperativa real instale el GPS físico en sus unidades y lo conecte a nuestro endpoint — eso no lo controlamos nosotros, es inversión de cada cooperativa

**Backend cerrado 05-ago-2026 (PR #46).** Migración `0022`: última posición conocida por viaje (`ubicacion_latitud`, `ubicacion_longitud`, `ubicacion_actualizada_en`), NO un historial completo del trayecto -- el requerimiento siempre fue "dónde está el bus ahora". Dos endpoints, con autenticación distinta según quién los usa:
- `PATCH /api-externa/viajes/:id/ubicacion` -- recepción, autenticado con la misma llave API de cooperativa que ya usa Modelo B (`ApiKeyGuard`), reutilizando el patrón exacto en vez de construir un tercer sistema de autenticación.
- `GET /viajes/:id/ubicacion` -- consulta pública, sin autenticación, vive en el módulo de búsqueda (no en `api-externa`, cuyo guard de llave API aplica a todas sus rutas y hubiera bloqueado incorrectamente al pasajero).

**Frontend bloqueado por API key de Google Maps, no por desarrollo.** A diferencia del ítem 15 (un link bastaba), un mapa que se actualiza en vivo necesita un mapa embebido de verdad, y eso requiere una API key de Google Maps -- confirmado, no está configurada en el proyecto hoy. Mismo tipo de bloqueo externo que la pasarela de pago con tarjeta y el proveedor de facturación electrónica (ver 3.4 y 3.6) -- no se investigaron alternativas sin API key, ya se había decidido este mismo patrón de "cableado ahora, conector cuando exista lo externo que falta" para Modelo B, no hacía falta reabrir la decisión.

**"Ver trayecto en el mapa" -- cerrado 05-ago-2026 (PR #45).** Hallazgo real: las coordenadas ya llegaban en cada resultado de búsqueda desde el backend, pero el frontend las descartaba en silencio -- `ResultadoViaje` en `lib/api.ts` no las declaraba. Corregido con los 4 campos + un link estándar a Google Maps (`https://www.google.com/maps/dir/?api=1&origin=...&destination=...`), sin SDK ni API key, abierto en pestaña nueva desde cada tarjeta de resultado.

**Falta:** endpoint + mapa en vivo para GPS (infraestructura genérica, sin esperar a ninguna cooperativa); cargar coordenadas reales exactas de cada terminal (tarea del dueño del proyecto, vía Google Maps); verificar nombres oficiales y provincias exactas de los 22 terminales cargados sin verificación individual.

---

### 3.3 Selección de asientos y checkout

**Requerimiento completo:** mapa de asientos que refleje el tipo real de vehículo (pisos, categorías VIP/normal por piso), bloqueo temporal mientras se paga, checkout con datos de pasajero (incluye reglas para menores de edad), aplicación de créditos disponibles, alerta clara si la cooperativa no permite cancelar/reprogramar.

**Estado real:** ✅ Completo.
- Mapa de asientos adaptable a cualquier distribución real (pisos, VIP)
- Contador de disponibles/ocupados
- Reglas de menores de edad (autorización de acompañante)
- Aplicación de créditos en el checkout
- Alerta de política de cancelación/reprogramación antes de pagar

**Análisis a profundidad (30-jul-2026):**

**Asientos exclusivos para mujeres** — mencionado en dos fuentes independientes (FlixBus, guías de desarrollo de plataformas 2026) como una función real y valorada, no un capricho: indicador de cuántas mujeres viajan a bordo, asientos con prioridad para viajeras, línea de ayuda dedicada. Tiene peso de seguridad real, especialmente relevante en viajes nocturnos interprovinciales. Requiere decisión de negocio antes de construir: ¿se ofrece como opción configurable por cooperativa (algunas la usan, otras no), o es una política uniforme de toda la plataforma?

**Decisión del director (30-jul-2026):** asientos exclusivos para mujeres — **✅ aprobado para construir**, pero como etiqueta informativa a nivel de asiento individual (mismo lugar donde la cooperativa ya marca "VIP" en su distribución), no como control de acceso forzado en la compra. Cada cooperativa decide si usa esta opción. No se verifica género al comprar — se evita ese problema de privacidad, se empieza solo con transparencia visual.

**Cerrado 05-ago-2026 (PR #44).** Hallazgo real encontrado antes de construir: "VIP" NO vivía a nivel de asiento individual como se asumía -- vivía a nivel de PISO completo, y confirmado con un caso real (Ecuador: buses de 2 pisos donde el piso 1 entero es VIP; Colombia: buses de un piso donde solo la sección delantera es VIP, imposible de representar con una etiqueta de piso completo). Se construyó un sistema único de etiquetas por asiento individual (VIP, mujeres, cualquier combinación), que unifica ambos casos reales -- no dos sistemas separados. Compatibilidad hacia atrás PERMANENTE con el formato viejo (decisión del director: sin script de migración destructiva, ya que se confirmó con datos reales que 0 tipos de vehículo tenían una distribución configurada). **Segundo bug real encontrado antes de construir:** el bloqueo de asientos ignoraba por completo `distribucionAsientos` y usaba su propia cuadrícula 2+2 hardcodeada, desincronizada del pasajero -- corregido para validar contra la distribución real. Configurable por cooperativa a nivel de tipo de vehículo (pantalla nueva en Unidades, editor JSON con vista previa en vivo, mismo patrón que la carga masiva del ítem 8).

**Falta:** nada.

---

### 3.4 Métodos de pago

**Requerimiento completo:** pago con tarjeta vía pasarela real; pago manual (transferencia, efectivo, billeteras digitales) configurable por cooperativa, con comprobante y confirmación.

**Estado real:** 🟡 Parcial, por decisión de negocio explícita (no por falta de desarrollo).
- Pago con tarjeta: **simulado**, pendiente conectar una pasarela real (PayPhone/Kushki — decisión de proveedor pendiente del dueño del proyecto)
- Pago manual: ✅ completo — transferencia bancaria, efectivo, DeUna, PayPhone (billetera), cada cooperativa con sus propios datos de cuenta, comprobante subido por el pasajero, confirmación/rechazo por la cooperativa

**Análisis a profundidad (30-jul-2026):** un método de pago guardado (para que un pasajero recurrente no tenga que volver a llenar todo cada vez) es común en plataformas maduras — pero no es urgente ahora, porque el pago con tarjeta todavía está simulado, no real. Se anota como mejora futura, después de conectar la pasarela real, no antes.

**Falta:** conectar pasarela de tarjeta real (bloqueado por decisión de proveedor, no técnico). Futuro, no urgente: método de pago guardado para compras recurrentes.

---

### 3.5 Boletos — ciclo de vida completo

**Requerimiento completo:** emisión con QR, cancelación, reprogramación con crédito, calificación post-viaje, solicitud de factura.

**Estado real:** ✅ Completo.
- Emisión con QR real
- Cancelación (libera el asiento)
- Reprogramación completa (genera crédito si el nuevo viaje es más barato, cobra diferencia si es más caro)
- Créditos: se generan, se visualizan, se pueden gastar en una compra nueva
- Política de cancelación/reprogramación configurable por cooperativa (puede prohibir una sin prohibir la otra)
- Calificación de viaje post-llegada
- Solicitud de factura del pasaje (puente con la cooperativa)

**Análisis a profundidad (30-jul-2026):** todas las fuentes de industria mencionan el boleto electrónico como algo que se puede guardar/acceder "en cualquier momento", incluyendo descarga en PDF para acceso sin conexión — hoy el boleto se ve en la app (QR + datos), pero no confirmé si existe descarga a PDF independiente de tener sesión activa/internet en el momento del abordaje. Punto real a verificar: qué pasa si el pasajero llega al terminal sin señal de datos — el código de pasajero fijo (sección 3.1.1) ayuda aquí también, como respaldo de identidad si el QR no carga.

**Cerrado 05-ago-2026 (PRs #41 backend, #42 frontend, #43 fix).** Investigado primero: no existía ninguna librería de PDF en el proyecto, ni generación de QR del lado del servidor (el QR de hoy se genera 100% en el navegador con `qrcode`/`<canvas>`, sin nada que reutilizar para un documento generado en Node). `pdfkit` + `qrcode` (`QRCode.toBuffer()`) del lado del servidor, mismo `codigo_qr` que ya se escanea hoy. Diseño con logo/marca, datos organizados en secciones claras (fecha, hora, asiento, pasajero, cooperativa), QR grande (220pt) y legible -- requisitos explícitos del director. **Bug real encontrado con una prueba visual real, no solo automatizada:** la fuente estándar de `pdfkit` no tenía el glifo de la flecha Unicode (→) entre origen y destino, la sustituía por basura visual -- corregido con ASCII seguro (`->`). Recordatorio de alcance explícito: este PDF NO es el diseño final tipo aerolínea (terminal exacto, política de cancelación, etc.) -- ese nivel de detalle y pulido visual queda para la Fase 6 (rediseño completo del frontend), decisión ya confirmada con el director.

**Falta:** nada.

---

### 3.6 Facturación

**Requerimiento completo:** la cooperativa factura el pasaje (su propia obligación tributaria); la plataforma factura su propio cargo de servicio con validez legal SRI real.

**Estado real:** 🟡 Parcial, por bloqueo externo real (certificado de firma electrónica).
- Puente de solicitud de factura del pasaje: ✅ completo (pasajero solicita, cooperativa marca emitida)
- Factura del servicio de la plataforma: ✅ construida con proveedor **simulado**, arquitectura lista para conectar un proveedor certificado real (Ecuafact, Factuplan, FacturaIA, etc.) sin rediseñar nada

**Falta:** conseguir proveedor certificado de facturación electrónica (bloqueo legal externo, no técnico).

---

### 3.7 Panel de cooperativa

**Requerimiento completo:** gestión de rutas, flota (tipos de vehículo, unidades), personal, viajes, validación de boletos por QR en abordaje, configuración (IVA, métodos de pago, política de cancelación), revisión de pagos manuales, revisión de solicitudes de factura.

**Estado real:** ✅ Completo.

**Análisis a profundidad (30-jul-2026) — puntos que agregaste, comparados con cómo operan plataformas serias tipo marketplace (Uber for Business, Airbnb para anfitriones, Shopify para tiendas):**

**1. Alta/onboarding de la cooperativa en la plataforma.** Confirmado con el usuario: la cooperativa se crea a mano por el admin de plataforma, con **todos los detalles** (nombre, logo, RUC, etc.) — esto se mantiene así, no se cambia a auto-registro.

**2. Carga masiva de datos operativos — hueco real, confirmado contra la industria (30-jul-2026).** Investigado: la carga masiva de flota (redBus Plus, sistemas CMMS de transporte 2026) es un estándar esperado en plataformas serias de este tipo, no un lujo. Cada unidad ya es única (placa, identificador operativo, distribución de asientos propia por tipo de vehículo) — eso está resuelto.
- **Horarios recurrentes -- backend cerrado 03-ago-2026 (PR #28).** CRUD de plantillas (`horarios_ruta`) + generador nuevo (módulo `generador-viajes`, cron diario 2am): solo hace `INSERT` si no existe un viaje para (plantilla, fecha) -- nunca `UPDATE`, así una edición manual de un viaje generado queda intacta para siempre (decisión del director: mismo patrón que calendarios con eventos recurrentes + excepciones). Distinto del generador de una sola vez que ya existía dentro de `importarDatos` (carga masiva) -- ese no previene duplicados ni enlaza `horario_ruta_origen_id`; ambos coexisten sin chocar. **Frontend cerrado 04-ago-2026 (PR #29):** panel expandible por ruta en `/panel-empresa/rutas` -- crear, listar, activar/desactivar plantillas.
- **Importación masiva de datos iniciales -- cerrada 04-ago-2026 (PRs #30, #31, #32).** Investigada primero, sin asumir (orden del director): existía backend completo (`POST /coop/importar`: tiposVehiculo, conductores, unidades, rutas, horarios) pero sin frontend y con solo cobertura parcial de pruebas. Hallazgo real: tenía su propio generador de viajes, distinto y más débil que el del ítem 7 (sin protección de duplicados, sin enlazar `horario_ruta_origen_id`). Trabajo en 3 pasos, en este orden:
  1. **Unificación:** el generador de la carga masiva ahora reutiliza `GeneradorViajesService.generarViajesParaHorarios`, el mismo mecanismo del cron -- se eliminó el camino paralelo. Cambio de contrato: `ItemImportHorario` ya no acepta `unidadRef`/`conductorRef`, ahora requiere `tipoVehiculoRef` (sin esto, un horario de carga masiva nunca podría generar viajes automáticos después).
  2. **Pruebas propias:** nueva prueba cubriendo `unidades`, `rutas`, `horarios`, verificando que los viajes generados quedan enlazados al horario real.
  3. **Frontend:** pantalla simple en `/panel-empresa/carga-masiva` -- textarea con el mismo JSON que ya acepta el backend, reporte de conteos.
  
  **Hallazgo técnico real, encontrado por las propias pruebas del ítem 7** (sin tocarlas): al compartir la lógica del bucle de generación, el rango pasó a ser inclusivo del día final (correcto para un rango que pide el usuario) -- pero el cron diario no ajustó su cálculo de "hasta", generando 22 días en vez de 21. Corregido.

**3. Contratiempos operativos (cierre de vía, feriado, paro) — backend cerrado 03-ago-2026 (PR #28).** Cancelación/suspensión masiva por ruta y rango de fechas. Decisión del director: los viajes con boletos vendidos SÍ se cancelan (no se bloquea la acción, no se saltan en silencio) -- se genera crédito automático por el monto pagado (mismo mecanismo que reprogramación) y se notifica por WhatsApp a cada pasajero afectado. Esto también extendió `cancelarViaje` individual, que antes cancelaba sin compensar -- ahora ambos caminos son consistentes. **Frontend cerrado 04-ago-2026 (PR #29):** mismo panel expandible por ruta, con confirmación explícita en 2 pasos antes de ejecutar (acción irreversible).

**Hallazgo técnico real, corregido por las propias pruebas e2e (03-ago-2026):** `WHERE b.id = ANY(array)` fallaba con "literal de array mal formado" -- Drizzle expande un array de JS como lista de parámetros (pensado para `IN (...)`), no como literal nativo de Postgres (que es lo que `ANY()` espera). Corregido con `sql.join()`. Ninguna prueba de tipos (`tsc`) lo hubiera detectado -- solo la ejecución real contra la base de datos lo hizo, confirmando por qué las 137 pruebas e2e no son opcionales.

**Pruebas propias, cerradas 04-ago-2026 (PR #29):** `horarios-cancelacion-masiva.e2e-spec.ts` -- CRUD de horarios, idempotencia del generador (verificada corriéndolo 2 veces con una edición manual en medio, la decisión de diseño central), cancelación masiva de viajes vacíos, y crédito automático verificado directo en base de datos. Estas mismas pruebas nuevas encontraron y corrigieron 2 bugs reales: un timestamp inválido en el generador (`horaSalida` de Postgres ya trae segundos) y una llave foránea faltante en el helper compartido de limpieza de pruebas (`horarios_ruta` nunca contemplada antes).

**4. Actualización periódica obligatoria de información.** Requerimiento nuevo, no construido: mismo patrón que usan plataformas financieras con revalidación de KYC — la cooperativa debería confirmar/actualizar sus datos legales y de contacto cada cierto tiempo (ej. cada 6-12 meses).

**5. "Nosotros les damos todas las herramientas".** Confirmado: para el Modelo A (panel directo), esto ya es cierto en lo cotidiano — rutas, flota, personal, viajes, precios, métodos de pago, política de cancelación. Para el Modelo B (cooperativas con sistema propio que se conectan por API), la promesa **se cumple para la infraestructura genérica** — cerrado 03-ago-2026, ver sección 3.11.

**Actualización periódica obligatoria de datos -- cerrada 04-ago-2026 (PRs #36 backend, #37 frontend).** Alcance confirmado por el director: razón social, RUC, dirección legal (columna nueva, no existía), teléfono y correo de contacto -- NO datos operativos (rutas, flota, precios), esos tienen su propio ciclo. 6 meses sin confirmar = banner de advertencia (no bloqueante). 12 meses de silencio total = se bloquea SOLO la creación de horarios recurrentes nuevos y la carga masiva -- nunca venta, validación de boletos, ni confirmación de pagos, bajo ninguna circunstancia. Endpoints `GET /coop/estado-datos` y `POST /coop/confirmar-datos`, banner persistente en el panel + sección de confirmación en Configuración.

**Falta:** nada. Modelo B: cerrado (ver 3.11) -- solo queda lo específico por cooperativa, que espera a la primera integración real.

---

### 3.8 Panel de administrador de plataforma

**Requerimiento completo:** gestión de cooperativas (alta/aprobación), puntos de operación (terminales), configuración global (cargo de plataforma, modo de IVA en boletos), banners promocionales propios.

**Estado real:** ✅ Completo, cerrado 04-ago-2026 (PRs #33 backend, #34 frontend) -- rol dividido en `super_admin` + `admin_plataforma`, con la matriz de permisos exacta y registro de auditoría.
- Migración `0019`: rol `super_admin` nuevo, más 3 valores nuevos de `accion_auditoria` -- reutiliza 2 valores que ya existían sin usar en el enum (`baja_cooperativa`, `cambio_comision`), en vez de duplicar
- `RolesGuard` hace coincidencia exacta, sin jerarquía -- `super_admin` no hereda automáticamente lo de `admin_plataforma`, se declaró explícito en cada endpoint
- **Decisión de diseño real, no en la orden original:** "eliminar cooperativa" y "eliminar administrador" se implementaron como baja lógica (`estado = 'dada_de_baja'`, `activo = false`), no `DELETE` físico -- destruir boletos/pagos/liquidaciones históricos sería peligroso e irreversible; un `DELETE` real de un administrador además violaría la propia llave foránea de auditoría
- Nuevos endpoints: `POST/GET/DELETE /admin/administradores`, `DELETE /admin/cooperativas/:id`
- Frontend: pantalla `/admin/administradores` -- crear/eliminar exclusivo de `super_admin`, listar compartido
- **Hallazgo real corregido en el camino:** el guardia de interfaz (`apps/web/app/admin/layout.tsx`) solo dejaba pasar `admin_plataforma`, bloqueando a `super_admin` del panel por completo -- corregido
- Migración de datos: todos los `admin_plataforma` existentes se quedaron como `admin_plataforma` -- el primer `super_admin` se creó a mano, decisión confirmada por el director

**Análisis a profundidad (30-jul-2026) — ¿un solo admin o super admin + admin?**

Investigado contra el estándar real de plataformas SaaS multi-tenant (Auth0, Cerbos, y el patrón de "delegated admin" que usan la mayoría de plataformas B2B serias): **la práctica correcta es NO dar el mismo nivel de poder a todo el que administra la plataforma.** El riesgo real sin esto: cualquier persona con acceso admin podría borrar una cooperativa completa, cambiar el cargo de plataforma, o crear otro admin — acciones que deberían reservarse solo al dueño real del negocio.

**Recomendación concreta — matriz de permisos:**
| Acción | super_admin | admin_plataforma |
|---|---|---|
| Crear/eliminar otros administradores | ✅ | ❌ |
| Eliminar una cooperativa por completo | ✅ | ❌ |
| Cambiar cargo de plataforma / modo de IVA | ✅ | ❌ |
| Aprobar/rechazar cooperativa nueva | ✅ | ✅ |
| Moderar publicidad (aprobar/rechazar campañas) | ✅ | ✅ |
| Generar liquidaciones | ✅ | ✅ |
| Gestionar terminales | ✅ | ✅ |

Esto sigue exactamente el mismo patrón que ya usamos bien en el panel de cooperativa (`admin_cooperativa` vs `vendedor`, con permisos distintos) — aplicar la misma lógica un nivel arriba, en la plataforma.

**Adicional, no considerado antes:** registro de auditoría — cada acción de un `admin_plataforma` debería quedar registrada (quién, qué, cuándo), para que el `super_admin` pueda revisar el historial si algo sale mal. Estándar real en plataformas SaaS serias, no un capricho.

**Pruebas de la frontera de seguridad, cerradas 04-ago-2026 (PR #35).** Orden explícita del director: un control de acceso no es una función más, no es opcional tener pruebas propias que confirmen que de verdad bloquea. `admin-permisos.e2e-spec.ts` -- 5 pruebas negativas (admin_plataforma recibe 403 en los 3 endpoints exclusivos) + 6 positivas (super_admin sí puede usarlos, confirmando que el bloqueo es específico del rol, no un error general). Bug real encontrado por la propia prueba (no en código de producción): mutaba `configuracion_plataforma` (tabla global compartida) sin restaurarla, contaminando 4 pruebas de `checkout.e2e-spec.ts` -- corregido con restauración explícita en `afterAll`.

**Falta:** nada.

---

### 3.9 Comercial / Publicidad (RF-COMM)

**Requerimiento completo:** catálogo de espacios publicitarios, planes comerciales, captación de leads de anunciantes con seguimiento de estado, campañas con flujo de aprobación obligatorio, servido dinámico en la landing (nunca dentro del flujo de compra), métricas de impresiones y clics, panel de administración visual.

**Estado real:** ✅ Completo — backend y panel de administración, cerrado 30-jul-2026 (4 pestañas: Espacios, Planes, Leads, Campañas; vista previa antes de aprobar, CTR calculado, exportar métricas a CSV).
- Backend: ✅ completo — espacios, planes, leads, campañas con aprobación/rechazo obligatorio, endpoint público de campañas activas por ubicación, registro de impresiones/clics, métricas por campaña
- Probado en vivo de punta a punta (creación de espacio, plan, campaña, aprobación, aparición en el endpoint público)

**Análisis a profundidad, como experto en ad-tech (30-jul-2026):**

**Los 4 espacios ya definidos usan medidas estándar reales de la industria** (IAB — Interactive Advertising Bureau, el estándar mundial de publicidad digital), no medidas inventadas:
| Espacio | Medida | Estándar |
|---|---|---|
| Banner horizontal | 970×250 | IAB "Billboard" — uno de los formatos de mayor impacto visual |
| Tarjeta nativa | 300×250 | IAB "Medium Rectangle" — el formato más usado en publicidad digital mundial |
| Unidad de video | 640×360 (16:9) | Proporción estándar de video, calidad premium, ancho completo |
| Tarjeta vertical | 300×600 | IAB "Half Page" — alto impacto, ideal para layouts de 2 columnas |

Esto confirma que el diseño ya está a la altura de plataformas modernas — el problema no es el diseño de los espacios, es que **nadie puede gestionarlos sin escribir una llamada API a mano.**

**Lo que le falta para ser realmente profesional, más allá del panel:**
- **Etiqueta "Publicidad"/"Patrocinado" obligatoria y visible** — investigado y confirmado: toda plataforma seria exige que un anuncio se identifique claramente como tal, incluso cuando se mezcla visualmente con el diseño del sitio (estándar real de transparencia publicitaria, no solo buena práctica). Hoy el diseño de los 4 espacios no contempla esta etiqueta — falta agregarla al construir el frontend de cada uno.
- **Calidad de creatividad antes de aprobar**: el flujo de aprobación ya existe (nadie pasa a "activa" sin aprobación explícita) — falta una checklist visual clara para quien aprueba (resolución mínima, formato correcto, sin contenido engañoso)
- **Métricas más completas que solo impresiones/clics crudos**: agregar CTR (tasa de clics) calculado, no solo el conteo — es el número que un anunciante real pide primero
- **Reporte descargable/exportable** para el anunciante — hoy las métricas solo se ven vía API, ningún anunciante va a pedirle a su equipo que use Postman
- **Nunca intrusivo**: ya decidido y correcto — ningún espacio publicitario vive dentro del flujo de compra, solo en la landing pública

**Falta:** nada del lado admin — las 4 pestañas, vista previa, CTR y exportar CSV ya están construidas y verificadas. Pendiente, aparte: que la etiqueta "Publicidad" se muestre también en la landing pública real (eso es responsabilidad del HTML/frontend de cara al pasajero, no de este panel administrativo).

---

### 3.10 Liquidaciones

**Requerimiento completo:** generar liquidación por cooperativa y período, listar liquidaciones, marcar como pagada, panel visual — tanto para el admin de plataforma como para que la cooperativa vea su propio historial.

**Estado real:** ✅ Completo, cerrado 30-jul-2026.
- Backend: genera, valida fechas, lista con filtro, marca pagada — más el endpoint nuevo `GET /coop/liquidaciones`, de solo lectura, para que la cooperativa vea su propio historial sin depender del admin de plataforma
- Frontend: `/admin/liquidaciones` (generar, ver todas, marcar pagada) y `/panel-empresa/liquidaciones` (solo lectura, agrupado en pendientes/pagadas)
- Verificado con `tsc` y 137/137 pruebas en la máquina real del usuario

**Falta:** nada.

---

### 3.11 Modelo B — Integración por API (cooperativas con sistema propio)

**Requerimiento completo:** cooperativas con su propio sistema de venta puedan conectarse a Columbus por API (credenciales, sincronización de disponibilidad en tiempo real, webhooks de eventos de venta), sin usar el panel web.

**Estado real:** ✅ Completo, cerrado 03-ago-2026 -- infraestructura genérica de Modelo B ("el cableado") construida en su totalidad, todo verificado y fusionado a `main`.
- Esquema (`api_externa.ts`): las 2 correcciones (`webhookUrl`, `apiKeyPrefix`) aplicadas -- migración `0017` corrida en la base de datos real
- Backend credenciales: CRUD completo (`GET/POST /coop/credenciales-api`, `POST .../rotar`, `DELETE .../:id`, `PATCH .../:id/webhook`) -- llave con formato `tkya_live_<prefijo>.<secreto>`, prefijo público para lookup, secreto hasheado con bcrypt, solo se muestra completa una vez (al crear o rotar)
- Frontend: pantalla `/panel-empresa/credenciales-api` -- crear, listar activas/revocadas, rotar, revocar con confirmación, editar webhook por credencial
- Backend despachador de webhooks: módulo nuevo (ports, repositorio Drizzle, service, module) -- envío inmediato al confirmar una venta (tarjeta y pago manual), nunca bloquea ni revierte la venta si el webhook falla; reintentos automáticos cada 5 min vía `@Cron` (`@nestjs/schedule`), hasta 5 intentos, después se marca `fallido`; una compra que mezcla boletos de varias cooperativas dispara un webhook por cada una
- Backend RECEPCIÓN (RF-API-002): `PATCH /api-externa/viajes/:id/precio` -- la cooperativa reporta cambios de precio en sus propios viajes, autenticado con su llave API (no JWT). Disponibilidad de asientos NO incluida a propósito -- riesgo real de corromper reservas ya confirmadas sin una estrategia de conflicto definida; queda para cuando exista la primera integración real
- Backend RECONCILIACIÓN (RF-API-004): `GET /api-externa/webhooks` -- la cooperativa consulta el estado de entrega de sus webhooks recientes (pendiente/confirmado/fallido), para verificar manualmente sin depender solo del reintento automático
- Documentación técnica de conexión completa: `MODELO_B_GUIA_TECNICA.md`, estilo guía Stripe/Twilio
- Verificado: `tsc` backend y frontend limpios, 137/137 pruebas e2e, `next build` 27/27 páginas, PR #23, #24 y #25 fusionados a `main` con CI en verde

**Especificación técnica del director (30-jul-2026), corregida tras discusión con el usuario:**

**Corrección importante:** la recomendación original de "esperar a que una cooperativa real lo pida" mezclaba dos cosas distintas. Se corrige aquí, siguiendo la analogía correcta del usuario: **el cableado se instala ahora, los conectores se adaptan cuando aparezca cada cooperativa real.**

**Lo genérico — construir ya, no depende de ninguna cooperativa específica (el "cableado"):**
- Sistema de llaves de acceso por cooperativa (crear, revocar, rotar)
- Mecanismo de webhooks reutilizable (entrega con reintentos si falla el primer intento — igual para cualquier cooperativa)
- Endpoints base: recibir disponibilidad/precios desde la cooperativa, enviar aviso de venta hacia la cooperativa
- Documentación técnica general de conexión (tipo guía de Stripe/Twilio)

**Lo específico — sí espera a una cooperativa real (el "conector a la medida"):**
- Ajustes de formato/nombres de campos según el sistema particular de esa cooperativa
- Casos particulares de su operación que hoy no se pueden anticipar sin verlos

**Progreso real (2-ago-2026):**

Al revisar el esquema `api_externa.ts` a fondo antes de construir el service/controller encima, se encontraron **2 huecos reales de diseño** que había que resolver primero:

1. **Faltaba `webhookUrl` en `credencialesApi`** — la tabla `webhooksLog` guardaba el evento y los reintentos, pero en ningún lado se guardaba la URL de destino (el endpoint del sistema propio de la cooperativa) a la que hay que enviar el aviso. Corregido: se agrega el campo.
2. **El API key no se podía buscar de forma segura y eficiente** — solo se guardaba `apiKeyHash`, que sirve para verificar una llave una vez que ya sabes cuál es, pero no para encontrarla. Con eso, validar una petición entrante habría exigido probar el hash contra todas las credenciales activas del país, una por una — no escala, y es una práctica insegura conocida. **Decisión (director, 2-ago-2026):** seguir el patrón estándar de Stripe/GitHub — guardar también un prefijo público de la llave en texto plano (ej. `tkya_live_a1b2c3...`) para hacer el lookup rápido, y hashear el resto.

**Decisión de negocio confirmada (director, 2-ago-2026): ¿quién administra las credenciales de la cooperativa (crear, revocar, rotar, configurar su URL de webhook)?**

**La propia cooperativa, en autoservicio** (`admin_cooperativa`) — mismo patrón ya establecido en el proyecto para métodos de pago y política de cancelación. Se descartó exigir aprobación del `admin_plataforma` para esto: rompería la consistencia del resto del sistema sin una razón de negocio real que lo justifique, y contradice el principio ya fijado de que Columbus se construye para venderse como SaaS de autoservicio, no a la medida de que alguien apruebe cada paso.

**Falta:** nada de la infraestructura genérica -- el "cableado" completo (sección 5, ítem 4) queda cerrado aquí. Lo único pendiente es "el conector a la medida": ajustes de formato/nombres de campos según el sistema particular de cada cooperativa, y sincronización de disponibilidad de asientos con una estrategia de conflicto real -- ambos se resuelven caso por caso cuando aparezca la primera integración real, no antes.

---

### 3.12 Notificaciones

**Requerimiento completo:** confirmación de compra, recordatorio de viaje próximo, aviso de cambio operativo (cambio de unidad/hora), por el canal que mejor le llegue al pasajero.

**Estado real:** ✅ Completo, cerrado 03-ago-2026.
- Confirmación de compra: ✅ funciona de punta a punta (correo simulado, mismo patrón que pagos)
- Recordatorio de viaje (RF-NOTIF-002): ✅ cron cada hora vía `@Cron` (`@nestjs/schedule`, mismo mecanismo que el despachador de webhooks), ventana de 24h antes de la salida, idempotente -- no reenvía si ya existe una fila de control para esa compra+viaje
- Aviso de cambio operativo (RF-NOTIF-003): ✅ disparo síncrono, enganchado en `cambiarUnidadViaje` justo donde ocurre el cambio real
- `NotificadorWhatsApp` + `SimuladorNotificadorWhatsApp`: ✅ mismo patrón que el simulador de correo existente
- Sin migración de base de datos -- el esquema ya tenía todo listo (enums `whatsapp`/`recordatorio_viaje`/`cambio_operativo`, `telefonoDestino`, `viajeId` en `notificaciones`)
- **Hallazgo reportado (03-ago-2026):** "aviso de cambio de hora" no tiene ningún camino operativo real en el sistema -- `editarViaje` bloquea por completo editar hora/precio si el viaje ya tiene boletos vendidos. Solo `cambiarUnidadViaje` permite una modificación post-venta hoy. El aviso solo se enganchó ahí; el cambio de hora queda pendiente de una decisión de producto (¿se habilita editarViaje con boletos vendidos, con su propio aviso? ¿se descarta del alcance?)
- Verificado: `tsc` limpio, 137/137 pruebas e2e, PR #26 fusionado a `main` con CI en verde

**Decisión del director, con datos reales (30-jul-2026):** investigado — las notificaciones de viaje por WhatsApp tienen 98% de apertura contra 20% en correo, y LATAM es una de las regiones de mayor adopción de WhatsApp Business (aerolíneas reales de la región, Aeroméxico y LATAM, ya lo usan exactamente para esto: confirmación, recordatorio, cambios). **Se establece WhatsApp como canal principal, correo como respaldo**, no al revés como estaba planteado originalmente. Esto no cambia el patrón técnico ya usado (simulador → proveedor real después) — solo cambia cuál proveedor se prioriza conectar primero cuando llegue esa fase (Twilio para WhatsApp, antes que Resend para correo).

**Falta:** decisión de producto sobre aviso de cambio de HORA (ver hallazgo arriba); conectar Twilio real cuando se decida (prioridad sobre Resend, Fase 4 -- conexiones externas).

---

### 3.13 Contador de usuarios registrados

**Requerimiento completo:** el administrador de plataforma puede ver cuántos usuarios están registrados en el sistema, con capacidad de desglosar por rol (pasajeros, staff de cooperativa, etc.).

**Estado real:** ✅ Completo, cerrado 2-ago-2026.
- Backend: endpoint `GET /admin/usuarios/contador`, cuenta usuarios con `activo=true` agrupados por rol; el service completa el desglose con cantidad 0 en roles sin usuarios todavía, y calcula el total
- Frontend (provisional, ver nota de Fase 6): tarjeta en `/admin` con el total y desglose por rol
- Verificado con `tsc` (backend y frontend) y 137/137 pruebas e2e locales; PR fusionado a `main` con las 4 verificaciones de CI en verde

**Falta:** nada.

**Hallazgo resuelto (2-ago-2026):** el CI de GitHub Actions reportó "88 pruebas e2e reales" en un PR, mientras que la ejecución local de `npm run test:e2e` reportaba 137/137. Investigado: el número "88" era una etiqueta de texto vieja escrita a mano en `ci.yml` (nombre del job y del paso), desactualizada desde que el proyecto creció -- el comando real que corre siempre fue `npm run test:e2e` completo, sin filtro ni subconjunto. Nunca hubo un hueco real de cobertura en CI. Corregido en `ci.yml` (se quitó el número fijo del nombre para que no se vuelva a desactualizar).

---

## 4. Requerimientos no funcionales

| Área | Estado |
|---|---|
| Rate limiting | ✅ Activo globalmente (100 peticiones/minuto por IP) |
| Monitoreo de errores (Sentry) | ✅ Configurado |
| Backups de base de datos | ✅ Automatizados, verificados con respaldos reales |
| Pruebas automatizadas | ✅ 155 pruebas end-to-end locales (144 previas + 11 nuevas de la frontera de seguridad super_admin/admin_plataforma, ítem 9, 04-ago-2026), ejecución en serie (corregido un riesgo real de falsos negativos por paralelismo). CI verificado con el mismo número (ver 3.13 -- discrepancia anterior era solo una etiqueta de texto vieja, ya corregida). |
| Multi-tenancy (RLS) | ✅ Verificado en vivo — una cooperativa no puede ver datos de otra |
| 2FA -- **✅ cerrado 06-ago-2026 (PRs #47 backend, #48 frontend)** | Obligatorio para las 3 cuentas administrativas (super_admin, admin_plataforma, admin_cooperativa), TOTP nativo con node:crypto (sin dependencia externa, tras 2 fricciones reales con `otplib`: API rota en su v13, e incompatible con Jest por depender de paquetes ESM puros). 10 códigos de recuperación de un solo uso. Frontend: QR y activación en una sola pantalla, entrada de código con 6 casillas (auto-avance, soporta pegar), pantalla de códigos de recuperación con advertencia de que solo se muestran una vez, camino de vuelta entre código de app y código de recuperación. Bug real corregido de paso: la redirección post-login nunca incluía `super_admin` (creado en el ítem 9) -- hubiera terminado en la portada de pasajero en vez de `/admin`. Verificado con el flujo completo real (QR real, código TOTP real, activación) en 165/165 pruebas e2e + `tsc` y `next build` limpios |
| Cumplimiento LOPD Ecuador -- **cerrado 06-ago-2026 (PR #47), con 3 excepciones externas documentadas** | 🟡 Investigado con fuentes reales (SPDP, ley misma, firmas de auditoría ecuatorianas) contra las 4 preguntas del director: consentimiento explícito (menores de 15 requieren representante legal, adolescentes 15-17 pueden dar el suyo), retención (principio de "solo el tiempo necesario", sin plazo fijo), derecho de eliminación (✅ construido, ver 3.1.1), y obligación de registro ante la autoridad. **Construido:** eliminación de cuenta por anonimización (no borra los datos del pasajero dentro de un boleto ya vendido -- es el registro contable de la cooperativa, decisión del director) + job de limpieza periódica de tokens antiguos. **Pendiente de gestión externa, no de código** (mismo criterio que pasarela de pago y facturación electrónica): Delegado de Protección de Datos (plazo de registro ya vencido, nov-dic 2025 -- posiblemente aplica a Columbus por manejar datos de menores y tener módulo de publicidad/leads, requiere confirmación de abogado real), Registro de Actividades de Tratamiento, y declaración de transferencias internacionales de datos (hosting) en la política de privacidad |
| `npm audit` -- **✅ cerrado 06-ago-2026 (PR #49)** | Investigadas las 6 vulnerabilidades una por una antes de aplicar nada: 5 vivían exclusivamente en herramientas de desarrollo (`jest`, `eslint`, `@nestjs/cli`, y -- confirmado con búsqueda real en todo el código -- `sharp` nunca se ejecuta porque el proyecto no usa `next/image` en ningún lugar), ninguna tocaba producción. `npm audit fix` (sin `--force`) aplicado en backend y frontend: **0 vulnerabilidades** en el frontend, Next.js se actualizó solo a 16.3.0 como parte del parche. **Pendiente, documentado a propósito:** `esbuild`/`drizzle-kit` en el backend -- su único arreglo (`--force`) bajaría `drizzle-kit` a una versión anterior con cambios incompatibles, y es la herramienta de migraciones usada en todo este proyecto; el riesgo real es cero porque vive 100% en una herramienta de desarrollo, nunca en el servidor. Verificado: `tsc` limpio, 165/165 pruebas e2e, `next build` 29/29 páginas |
| Despliegue real (Render + Vercel) | 🔴 Decisión tomada, sin ejecutar — corre solo en local |
| Prueba de carga real | 🔴 Nunca simulada |
| Rebrand a "Columbus" en código real | 🔴 Pendiente, software real sigue diciendo "TicketYa" |
| Accesibilidad -- **🟡 parte 1 cerrada 06-ago-2026 (PRs #50, #51)** | Estándar: WCAG 2.2 nivel AA (confirmado con 7 fuentes reales como el estándar de facto de la industria). Auditado con Lighthouse contra 2 pantallas reales (portada pública y panel admin autenticado): ambas partían de 90/100 con los mismos 2 problemas sistémicos -- contraste insuficiente (`text-brand-dark/60` da 4.38:1 sobre blanco, calculado con la fórmula real de WCAG; por debajo del mínimo de 4.5:1) y etiquetas de formulario sin conectar (0 usos de `htmlFor` en las 125 etiquetas `<label>` de todo el frontend). **Corregido:** las 198 apariciones de `/60` subidas a `/70` (contraste real ≈5.16:1) en todo el proyecto; etiquetas conectadas en el buscador principal (portada). Portada verificada de nuevo con Lighthouse: **100/100.** **Incidente real durante la corrección, documentado sin ocultarlo:** un script de PowerShell corrompió 3 archivos con corchetes en la ruta (`[id]`, `[viajeId]`) por un bug real de manejo de variables tras un error -- se fusionó a `main` sin detectarlo a tiempo. Encontrado por revisión del propio diff antes de seguir avanzando, revertido, corregido a mano con precisión, y verificado con una corrida de CI real contra el estado final de `main` (PR #51) -- no se dio por cerrado con solo la palabra de que "ya se revisó localmente". **Falta (parte 2, tarea aparte):** conectar `htmlFor`/`id` en las 121 etiquetas restantes del resto del proyecto -- no es rediseño, pero sí requiere revisión archivo por archivo (varias viven dentro de listas repetidas con `.map()`, donde un id fijo causaría colisiones); navegación completa por teclado, regiones de referencia (landmarks), lectores de pantalla en componentes complejos (mapa de asientos, editor de distribución) -- quedan para Fase 6 |

**Análisis de prioridad del director (30-jul-2026), no todos estos pesan igual:**

**LOPD Ecuador sube de prioridad — riesgo real, no genérico.** El sistema maneja cédulas de pasajeros adultos, y datos de menores de edad (autorización de viaje acompañado). Estos son categorías de datos con protección reforzada en la mayoría de leyes de protección de datos, incluida la ecuatoriana. Esto no es un "revisar cuando haya tiempo" — es el tipo de incumplimiento que puede generar sanciones reales si se lanza sin revisarlo. Se sube a la Fase 3, primero en su lista, no al final.

**Accesibilidad — hallazgo nuevo, no analizado hasta hoy.** Ninguna sesión de este proyecto la mencionó. Para una plataforma que aspira a ser "la mejor del mercado" y de uso masivo nacional, ignorarla no es neutral — deja fuera a personas con discapacidad visual o motriz de un servicio esencial (transporte). Se agrega como requerimiento nuevo.

**Parte 1 cerrada 06-ago-2026** (ver tabla de requerimientos no funcionales para el detalle completo) -- investigado con Lighthouse real, corregidos los 2 hallazgos sistémicos (contraste, etiquetas del buscador principal), portada a 100/100.

**Diferencia CI vs local (137 vs 88) — hallazgo cerrado (2-ago-2026).** Investigado y corregido: era una etiqueta de texto vieja en `ci.yml`, no una diferencia real de cobertura. El CI y el entorno local corren exactamente las mismas 137 pruebas.

---

## 5. Hoja de ruta por fases, derivada de este análisis

**Regla acordada:** funcionalidad backend al 100% primero. Frontend/diseño visual final va al último, después de que todo lo demás esté cerrado.

**Regla reforzada (2-ago-2026):** ninguna construcción nueva empieza sin que la decisión correspondiente ya esté escrita en este documento y confirmada — se escribe primero, se confirma, y recién ahí se construye. Esta regla nace de un descuido real: se discutieron y cerraron decisiones de Modelo B (los 2 hallazgos de esquema, la decisión de autoservicio) en una conversación, pero se avanzó a construir otra pieza (el contador de usuarios) antes de escribirlas aquí — se recuperaron a tiempo porque quedaron en el historial de chat, pero no debe depender de eso nunca más.

**Decisiones pendientes de tu confirmación antes de construir (análisis ya hecho, sección 3):**
- Aviso de cambio de HORA de un viaje ya vendido -- ¿se habilita `editarViaje` para viajes con boletos vendidos (con su propio aviso), o se descarta del alcance de notificaciones? (3.12, hallazgo del 03-ago-2026)

### Fase 1 — Paneles de administración faltantes (backend ya existe, salvo lo indicado)
~~1. Panel de Comercial/Publicidad~~ — **cerrado 30-jul-2026**
~~2. Panel de Liquidaciones (admin) + endpoint nuevo de solo lectura para la cooperativa~~ — **cerrado 30-jul-2026**

### Fase 2 — Funciones nuevas, backend + frontend desde cero
~~3. Contador de usuarios registrados~~ — **cerrado 2-ago-2026**
~~4. Modelo B~~ — **cerrado 03-ago-2026** (ver 3.11): infraestructura genérica completa (esquema, credenciales, despachador de webhooks, recepción, reconciliación, documentación técnica), todo verificado y fusionado a `main`. Lo específico por cooperativa espera a la primera integración real
~~5. Notificaciones automáticas~~ — **cerrado 03-ago-2026** (ver 3.12): WhatsApp como canal principal, recordatorio de viaje y aviso de cambio operativo (unidad) construidos y verificados. Cambio de hora queda pendiente de decisión de producto, no de construcción
~~6. Código de pasajero fijo + límite de frecuencia~~ — **cerrado 03-ago-2026** (ver 3.1.1): decisión confirmada, construido y verificado
~~7. Horarios recurrentes (plantilla) y cancelación/suspensión masiva por ruta y fecha~~ — **cerrado 04-ago-2026** (PR #28 backend + PR #29 frontend y pruebas propias)
~~8. Verificar y, si falta, construir importación masiva de flota inicial~~ — **cerrado 04-ago-2026** (ver 3.7): existía backend parcial, se unificó su generador con el ítem 7, se completaron pruebas y se construyó el frontend (PRs #30, #31, #32)
~~9. División super_admin / admin_plataforma + registro de auditoría~~ — **cerrado 04-ago-2026** (ver 3.8): decisión confirmada, construido y verificado (PRs #33, #34)
~~10. Actualización periódica obligatoria de datos de cooperativa~~ — **cerrado 04-ago-2026** (ver 3.7): decisión confirmada, construido y verificado (PRs #36, #37)
~~11. Filtros de búsqueda (hora, tipo, amenidades) + campo de amenidades en tipo de vehículo~~ — **cerrado 05-ago-2026** (ver 3.2): construido y verificado (PRs #38, #39). Filtro por tipo de vehículo: backend listo, sin exponer en frontend (ver nota en 3.2)
~~12. Exponer calificación promedio en resultados de búsqueda~~ — **cerrado 05-ago-2026** (ver 3.2): ya existía, se le agregó el umbral mínimo de confianza que faltaba (PR #40)
~~13. Descarga de boleto en PDF~~ — **cerrado 05-ago-2026** (ver 3.2): investigado, construido y verificado con prueba visual real (PRs #41, #42, #43)
~~14. Asientos/indicador exclusivo para mujeres~~ — **cerrado 05-ago-2026** (ver 3.3): unificado con VIP en un solo sistema por asiento individual, construido y verificado (PR #44)
~~15. Botón "ver trayecto" (ruta fija terminal origen → destino en un mapa)~~ — **cerrado 05-ago-2026** (ver 3.2): construido y verificado (PR #45)
16. Seguimiento GPS en vivo -- **backend cerrado 05-ago-2026** (ver 3.2, PR #46): esquema + los 2 endpoints construidos y verificados. **Frontend bloqueado por API key de Google Maps, no por desarrollo** -- mismo lenguaje que los otros 2 bloqueos externos (3.4, 3.6), se retoma cuando el dueño del proyecto consiga la API key. **Cerrado a nivel de fase (decisión del director, 05-ago-2026)**: no se mantiene la Fase 2 abierta esperando una gestión externa que no depende del desarrollo -- mismo criterio que aplicará a la Fase 4 (pasarela de pago, facturación electrónica) cuando existan esas gestiones resueltas.

**Depende de terceros, no se construye con código (aplica a ambos, Modelo B y GPS):**
- Que una cooperativa real instale hardware GPS y lo conecte a nuestro endpoint
- Que una cooperativa real se conecte al Modelo B con su propio sistema

**✅ Fase 2: completa (05-ago-2026), con 1 excepción externa documentada** — los 16 ítems tienen su trabajo de desarrollo cerrado; el único punto pendiente (frontend del mapa GPS en vivo, ítem 16) espera una gestión externa (API key de Google Maps), no código. Se avanza a la Fase 3 con esta excepción documentada, mismo criterio que se aplicará a la Fase 4.

### Fase 3 — Seguridad y cumplimiento de producción
~~17. Revisión de cumplimiento LOPD Ecuador~~ — **cerrado 06-ago-2026** (ver requerimientos no funcionales, PR #47): investigado con fuentes reales, construidas las 2 piezas técnicas (eliminación de cuenta, limpieza de tokens), 3 excepciones externas documentadas (DPD, RAT, declaración de hosting)
~~18. Investigar la diferencia CI (88) vs local (137) en las pruebas automatizadas~~ — **resuelto 2-ago-2026**, era una etiqueta de texto vieja en `ci.yml`, corregida
~~19. 2FA para cuentas administrativas~~ -- **cerrado 06-ago-2026** (ver requerimientos no funcionales, PRs #47 backend, #48 frontend): construido y verificado de punta a punta
~~20. `npm audit` a fondo~~ -- **cerrado 06-ago-2026** (ver requerimientos no funcionales, PR #49): 5 de 6 vulnerabilidades corregidas, 1 documentada como pendiente de bajo riesgo real
21. Accesibilidad -- **parte 1 cerrada 06-ago-2026** (ver requerimientos no funcionales, PRs #50, #51): contraste WCAG AA y etiquetas del buscador principal corregidos, portada 90→100/100 en Lighthouse. **Parte 2 pendiente:** 121 etiquetas restantes, navegación por teclado completa, landmarks -- Fase 6 para lo que requiere rediseño

### Fase 4 — Conexiones externas reales (bloqueadas por decisiones/gestiones externas al desarrollo)
22. Pasarela de pago con tarjeta real (esperando decisión de proveedor)
23. Proveedor certificado de facturación electrónica (esperando gestión externa)

### Fase 5 — Infraestructura
24. Ejecutar despliegue real a Render + Vercel
25. Prueba de carga real

### Fase 6 — Frontend y marca (al final, ya acordado)
26. Rebrand completo a "Columbus" en `apps/web`
27. Diseño visual final de la landing

---

## 6. Regla de mantenimiento de este documento

Este documento se actualiza al cierre de cada sesión de trabajo real donde algo cambie de estado — no solo cuando se pida explícitamente. **Ninguna construcción nueva empieza sin que la decisión ya esté escrita aquí y confirmada primero (regla reforzada 2-ago-2026, ver sección 5).** Ningún resumen de conversación ni memoria de sesión reemplaza esto como fuente de verdad. Antes de escribir código nuevo, se consulta este documento primero.
