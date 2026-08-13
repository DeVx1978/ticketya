# Columbus (TicketYa) — Documento Maestro de Requerimientos y Estado Real

**Última actualización:** 2 de agosto de 2026 — corrección de sincronización: se documenta el progreso real de Modelo B (esquema corregido, decisiones de diseño y de negocio cerradas) que se había discutido pero no se había escrito antes de avanzar a otra pieza. Se corrige también la numeración de la hoja de ruta, que se reiniciaba en cada fase en vez de continuar. El análisis original (secciones 3.1 a 3.13 + requerimientos no funcionales) sigue siendo la referencia completa; a partir de aquí, cada sección se actualiza a "cerrado" apenas se construye y verifica — antes de avanzar a la siguiente pieza, no después.

**Propósito de este documento:** ser la ÚNICA fuente de verdad del proyecto. Antes de escribir código, se consulta este documento. **Regla reforzada (2-ago-2026): ninguna construcción nueva empieza sin que la decisión ya esté escrita aquí y confirmada — se escribe primero, se confirma, y recién ahí se construye.** Ningún resumen de conversación reemplaza esto.

**Cómo está organizado:** cada sección funcional tiene tres partes — (1) qué DEBE hacer (el requerimiento completo, sin importar si ya existe), (2) el estado real verificado, (3) qué falta exactamente. Al final, la hoja de ruta por fases sale de comparar (1) contra (2).

---

## 0. Objetivo final del proyecto -- leer esto ANTES de cualquier decision (confirmado con el director, 07-ago-2026)

**Columbus debe ser, sin excepcion, mejor que las plataformas de venta de pasajes mas usadas y populares del mundo -- no igual, mejor.** Esta es la instruccion mas importante de todo este documento, y debe guiar cada decision de construccion de aqui en adelante. Tiene 4 partes obligatorias, ninguna opcional:

**1. Todas las funciones del flujo de compra que un pasajero esperaria de las mejores plataformas -- no solo lo basico.** Incluye, con evidencia real ya investigada:
- ~~Comprar para varias personas en una sola transaccion, e ida y vuelta~~ -- cerrado 11-ago-2026 (ver Fase 7, item 29, PRs #58/#59).
- ~~Reseñas de texto reales de otros pasajeros~~ -- **cerrado 13-ago-2026** (ver 3.2.1). Rastreo en vivo del bus, sistema de puntos/cashback tipo ClickBus, programa de referidos -- ver la investigacion comparativa completa contra redBus, ClickBus, FlixBus, Busbud, Wanderu, Rome2Rio, CheckMyBus, Booking.com y Skyscanner (07-ago-2026), con brechas priorizadas en 3 categorias (esencial / ventaja competitiva / cosmetico) -- documento aparte, pendiente de retomar despues de cerrar la Fase 7.
- Ningun item se marca "completo" sin responder primero "¿que le falta comparado con las mejores plataformas del mundo?" (regla no negociable, ver seccion 5).

**2. Publicidad real y visible en la landing.** El sistema completo (banners, planes comerciales, leads de anunciantes) ya esta construido por dentro (ver 3.9) y las reglas visuales ya estan investigadas con fuentes reales (formato discreto tipo resultado organico, video flotante estilo YouTube, nunca invasivo, nunca dentro del flujo de compra). Falta conectarlo visualmente en la landing final -- pendiente, Fase 6 en adelante.

**3. El mejor diseno y estilo posible en la landing.** Nueva identidad de marca Columbus (negro/amarillo/blanco, medida con precision real del logo oficial) ya cerrada y verificada en produccion (ver item 28). Pendiente: contenido visual real que llene la portada -- fotos reales de buses/rutas (bloqueado hoy por falta de infraestructura de subida real de archivos y de licencia de fotos genericas, decision de negocio del director) y testimonios reales de pasajeros (no existen datos reales todavia, no se deben inventar).

**4. Todo lo que ya esta construido y funcionando de verdad se mantiene, y se sigue verificando con el mismo rigor -- no se toca solo por tocar.** Seguridad (2FA, permisos separados, RLS multi-tenant), pagos manuales completos, paneles de cooperativa y plataforma, cumplimiento legal ecuatoriano (LOPD, tarifas diferenciadas LOTTTSV Art. 79 -- confirmado que YA funciona), despliegue real en produccion, 170 pruebas automatizadas.

## 0.1 Estrategia de desarrollo confirmada (director, 11-ago-2026): backend primero, frontend despues

**Orden de prioridad confirmado:** de aqui en adelante, se prioriza terminar el backend por completo antes de retomar trabajo grande de frontend/diseno. El frontend se construira despues, sobre un backend ya terminado y estable -- no en paralelo.

**Sobre el diseno visual (referencia, no decision final todavia):** el director comparto una maqueta de referencia para el hero de la portada (fondo de foto a pantalla completa, buscador incrustado directo sobre la foto, etiqueta de "proxima salida" con punto pulsante, paleta negro/amarillo ya confirmada). Se guarda como **referencia visual de estilo**, no como decision cerrada -- el director aun no tiene definido que secciones exactas llevara la portada completa, y prefiere no forzar esa decision todavia. **Tipografia: se mantiene la ya usada en el proyecto, NO se adoptan las 3 fuentes nuevas de la maqueta (Sora/Inter/IBM Plex Mono).**

**Que significa esto en la practica:** los proximos items a construir deben ser de backend (Fase 8 items 32-33 ya autorizados si faltara algo, item 31 -- compra como invitado, o cualquier otro hueco de backend documentado). El trabajo de portada/diseno visual queda pausado hasta que el backend este completo.

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

### 3.2.1 Reseñas de texto reales -- CERRADO (13-ago-2026)

**Hallazgo real que originó esta tarea:** el campo `comentario` de cada calificación se guarda desde el 22-jul-2026 (ver 3.5, ciclo de vida del boleto), pero nunca existió ningún endpoint que lo devolviera -- `resumenPorCooperativa()` solo entregaba `{ promedio, cantidad }`. El comentario que un pasajero escribía quedaba invisible para siempre, sin que nadie -- ni otro pasajero, ni la propia cooperativa -- pudiera leerlo jamás.

**Investigado antes de construir:**
- **Airbnb** confirma explícitamente en su documentación que las reseñas muestran solo el primer nombre del autor, nunca el apellido -- el estándar más protector de privacidad entre las plataformas líderes revisadas.
- **Amazon** usa 10 reseñas por página como su paginación estándar.
- Decisión del director: primer nombre + 10 por página, ambos confirmados con la evidencia de arriba.

**Decisión de alcance -- mismo umbral que el ítem 12, no uno nuevo inventado.** Antes de construir se revisó el valor real ya decidido para el promedio numérico (ítem 12, Fase 2, 05-ago-2026): 5 calificaciones mínimas antes de mostrar nada, mismo criterio que Google/Amazon. Las reseñas de texto usan el mismo umbral -- por debajo de 5 calificaciones totales de la cooperativa (no 5 con comentario, 5 en total), el endpoint devuelve la lista vacía, ni siquiera un aviso.

**Construido:**
- `GET /calificaciones/cooperativa/:cooperativaId/resenas` -- público, sin autenticación, mismo criterio que el promedio (es información que ayuda a decidir *antes* de comprar). Paginado (`pagina`, `porPagina`, 10 por defecto, máximo 50).
- Solo devuelve calificaciones con `comentario` real (no vacío) -- una calificación sin texto no es una "reseña".
- `nombreAutor` viene de `pasajeros_compra.nombres` (el campo separado desde el ítem 31.1) -- nunca `apellidos`.
- **Hallazgo real encontrado en el camino, no anticipado:** `ResultadoViaje` (la respuesta de `/viajes/buscar`) nunca incluía `cooperativaId` -- no era un caso de "se descarta en silencio" como el de las coordenadas del ítem 15, el backend nunca lo seleccionaba en primer lugar. Sin esto, el frontend no tenía forma de pedir las reseñas de una cooperativa específica desde la lista de resultados. Agregado tanto en `busqueda.service.ts` como en la interfaz del frontend.
- Frontend: componente `ResenasCooperativa.tsx`, plegado por defecto en cada tarjeta de resultado de `/buscar` -- se carga bajo demanda (nunca se piden las reseñas de las 10 cooperativas de una búsqueda de una sola vez, solo cuando el pasajero hace clic en "Ver reseñas"), con paginación real (Anterior/Siguiente).

**Bug real encontrado por la propia prueba e2e de este mismo cambio, corregido antes de fusionar:** el primer diseño de la consulta usaba `COUNT(*) OVER()` para traer el total en la misma consulta paginada. Cuando la página pedida no tenía ninguna fila (ej. pedir la página 2 de una cooperativa con solo 1 reseña real), la consulta no devolvía ninguna fila -- y con eso, la función de ventana tampoco devolvía ningún total, así que `total` volvía 0 en vez del valor real. Corregido separando el conteo en su propia consulta, independiente de la paginación.

**Verificado:** `tsc --noEmit` limpio en backend y frontend, `next build` 29/29 páginas, y 174/174 pruebas e2e (171 previas + 3 nuevas: umbral no alcanzado, camino feliz con filtro de comentario + primer nombre, y paginación con página vacía).

**Falta:** nada de lo pedido. Pendiente para otra sesión, no parte de esta tarea: la investigación comparativa más amplia (cashback/fidelidad, programa de referidos) que sigue documentada como brecha en la sección 0.

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

**Decisión de diseño confirmada, 07-ago-2026 -- patrón visual específico del video, para construir en Fase 6:** en pantalla de escritorio, la unidad de video (640×360) aparece pequeña y flotante en una esquina de la página -- mismo patrón que usa YouTube con sus anuncios flotantes -- nunca ocupa el centro ni interrumpe la navegación. El usuario puede expandirlo si quiere verlo más grande, o lo ignora y sigue navegando sin que le estorbe. Aplica el mismo principio ya establecido ("nunca invasivo, nunca dentro del flujo de compra") con este patrón visual concreto -- no como una tarjeta fija grande en medio de la página.

**Investigación real, 07-ago-2026, para las reglas finales de la Fase 6 -- solo 3 espacios en la landing (banner horizontal, tarjeta nativa, video flotante); la tarjeta vertical queda reservada para después, fuera de la landing principal.** Investigado con el mismo rigor que WCAG: Booking Holdings (Booking.com/Priceline/Agoda), Skyscanner, y el lanzamiento de "Paid Posts" de The New York Times, todos con fuentes reales y verificables.

- **Formato visual:** el resultado patrocinado usa el MISMO formato de tarjeta que un resultado orgánico (confirmado con la documentación oficial de Booking.com y Skyscanner para anunciantes) -- mismo tamaño, tipografía y bordes que el resto de Columbus, insertado dentro del flujo natural de contenido, nunca como bloque que interrumpe.
- **Etiqueta:** texto pequeño y discreto ("Publicidad"), en una esquina de la tarjeta, sin sello llamativo ni color de alarma -- puede llevar un tinte de fondo sutil (como el celeste claro que usa el NYT en sus "Paid Posts"), nunca oculto. Principio citado de un panelista de Time Inc. en el Contently Summit, que resume el criterio de toda la investigación: "Don't trick them; don't piss them off" -- no engañar, pero tampoco molestar.
- **Video flotante:** regla no negociable, del propio estándar oficial IAB ("LEAN"): el usuario debe tener la opción inmediata de cerrar el video desde el inicio, nunca una cuenta regresiva forzada. Comportamiento confirmado con el propio mini-reproductor de YouTube: no aparece desde que carga la página -- se activa solo cuando el contenido principal sale de la vista al hacer scroll, y desaparece si se vuelve a subir. Ancla en una sola esquina fija, pequeño, con la "X" de cierre siempre visible. Hallazgo real de advertencia (reportado por medios técnicos): una versión de YouTube que "rebotaba" entre las 4 esquinas generó rechazo real de usuarios -- debe ser estable, nunca moverse ni crecer sin que el usuario lo pida.
- **Límite honesto de esta investigación:** ninguna fuente real da un número universal de "después de cuántos resultados" debe aparecer el elemento patrocinado en una lista -- es una decisión de diseño propia de Columbus, no un estándar externo citable.

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
| **Diseño responsive -- regla no negociable, 07-ago-2026** | 🔴 Requisito obligatorio, mismo peso que "nunca bloquear venta/validación/pagos": el diseño debe ser profesional en absolutamente todo dispositivo -- celular, tablet, laptop, pantalla grande de escritorio. No es una meta deseable, aplica automáticamente a cada pantalla que se construya o rediseñe de aquí en adelante, sin necesidad de repetirlo cada vez |
| 2FA -- **✅ cerrado 06-ago-2026 (PRs #47 backend, #48 frontend)** | Obligatorio para las 3 cuentas administrativas (super_admin, admin_plataforma, admin_cooperativa), TOTP nativo con node:crypto (sin dependencia externa, tras 2 fricciones reales con `otplib`: API rota en su v13, e incompatible con Jest por depender de paquetes ESM puros). 10 códigos de recuperación de un solo uso. Frontend: QR y activación en una sola pantalla, entrada de código con 6 casillas (auto-avance, soporta pegar), pantalla de códigos de recuperación con advertencia de que solo se muestran una vez, camino de vuelta entre código de app y código de recuperación. Bug real corregido de paso: la redirección post-login nunca incluía `super_admin` (creado en el ítem 9) -- hubiera terminado en la portada de pasajero en vez de `/admin`. Verificado con el flujo completo real (QR real, código TOTP real, activación) en 165/165 pruebas e2e + `tsc` y `next build` limpios |
| Cumplimiento LOPD Ecuador -- **cerrado 06-ago-2026 (PR #47), con 3 excepciones externas documentadas** | 🟡 Investigado con fuentes reales (SPDP, ley misma, firmas de auditoría ecuatorianas) contra las 4 preguntas del director: consentimiento explícito (menores de 15 requieren representante legal, adolescentes 15-17 pueden dar el suyo), retención (principio de "solo el tiempo necesario", sin plazo fijo), derecho de eliminación (✅ construido, ver 3.1.1), y obligación de registro ante la autoridad. **Construido:** eliminación de cuenta por anonimización (no borra los datos del pasajero dentro de un boleto ya vendido -- es el registro contable de la cooperativa, decisión del director) + job de limpieza periódica de tokens antiguos. **Pendiente de gestión externa, no de código** (mismo criterio que pasarela de pago y facturación electrónica): Delegado de Protección de Datos (plazo de registro ya vencido, nov-dic 2025 -- posiblemente aplica a Columbus por manejar datos de menores y tener módulo de publicidad/leads, requiere confirmación de abogado real), Registro de Actividades de Tratamiento, y declaración de transferencias internacionales de datos (hosting) en la política de privacidad |
| `npm audit` -- **✅ cerrado 06-ago-2026 (PR #49)** | Investigadas las 6 vulnerabilidades una por una antes de aplicar nada: 5 vivían exclusivamente en herramientas de desarrollo (`jest`, `eslint`, `@nestjs/cli`, y -- confirmado con búsqueda real en todo el código -- `sharp` nunca se ejecuta porque el proyecto no usa `next/image` en ningún lugar), ninguna tocaba producción. `npm audit fix` (sin `--force`) aplicado en backend y frontend: **0 vulnerabilidades** en el frontend, Next.js se actualizó solo a 16.3.0 como parte del parche. **Pendiente, documentado a propósito:** `esbuild`/`drizzle-kit` en el backend -- su único arreglo (`--force`) bajaría `drizzle-kit` a una versión anterior con cambios incompatibles, y es la herramienta de migraciones usada en todo este proyecto; el riesgo real es cero porque vive 100% en una herramienta de desarrollo, nunca en el servidor. Verificado: `tsc` limpio, 165/165 pruebas e2e, `next build` 29/29 páginas |
| Despliegue real (Render + Vercel) | 🔴 Decisión tomada, sin ejecutar — corre solo en local |
| Prueba de carga real | 🔴 Nunca simulada |
| Rebrand a "Columbus" en código real | 🟡 Backend parcial cerrado (13-ago-2026): las 4 apariciones de marca visible corregidas (nombre por defecto en admin, emisor 2FA, descripcion de cargo en facturas, texto y color del PDF del boleto -- color corregido de azul viejo a #000000, el negro real medido del logo oficial). Deliberadamente sin tocar: nombres de rol de base de datos (`ticketya_app`, `ticketya_platform_admin` -- requeriria ALTER ROLE en produccion, riesgo real sin beneficio visible) y la sal criptografica fija del cifrado TOTP (cambiarla romperia el 2FA de cuentas admin ya configuradas -- necesita su propia migracion cuidadosa, no un cambio de texto). Frontend: pendiente, coordinar con esa conversacion. |
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

**REGLA NUEVA, NO NEGOCIABLE, 07-ago-2026 -- superioridad funcional real, no solo funcionamiento correcto.** Esta plataforma debe tener absolutamente todas las funciones que tienen las mejores plataformas de compra de pasajes que existen en el mundo -- e incluso superarlas. Esta regla nace de un hallazgo grave: se reportó la Fase 6 como "completa" y "verificada en producción real" el mismo día en que se confirmó que faltaban funciones centrales de compra (ver ítem nuevo más abajo). El error real fue mezclar "verificado que funciona" con "está completo" -- son cosas distintas. **A partir de ahora, ningún ítem se marca como "completo" sin responder primero, explícitamente: "¿qué le falta a esto comparado con las mejores plataformas del mundo?" -- no solo "¿esto que construí funciona bien?".**

**Auditoría real del 07-ago-2026, con evidencia de código -- 4 huecos reales confirmados en el flujo central de compra, ninguno detectado antes de hoy:**

29. **Compra multi-pasajero (varias personas, una sola transacción)** -- **NO EXISTE**, confirmado con evidencia real: el campo "Pasajeros" del buscador (`BuscadorForm.tsx`) es decorativo, se pasa como texto a la página de resultados (`/buscar`) pero nunca llega a la pantalla de asientos ni al checkout. `apps/web/app/viajes` completo tiene CERO referencias a "pasajeros". **Hallazgo importante que reduce el tamaño real del arreglo:** el backend YA está listo de punta a punta -- `checkout.service.ts`, función `procesarCompra(pasajeros: PasajeroCheckout[], ...)`, recibe un ARREGLO, no un solo pasajero, y el controlador (`ventas.controller.ts`) pasa `dto.pasajeros` completo sin recortarlo. El único ajuste real de backend necesario: `bloquearAsiento` (`asientos.controller.ts`) solo acepta un asiento por llamada -- se resuelve llamándolo varias veces desde el frontend antes de mandar la compra completa junta, sin tocar el backend. Es, en la práctica, un trabajo de frontend: permitir elegir varios asientos en el mapa (hoy la variable es `seleccionado: string | null`, singular) y que el checkout pida los datos de cada pasajero elegido. **Prioridad máxima, primero en la lista.**
30. **Límite de asientos por compra/por persona** -- **NO EXISTE ningún límite hoy.** Técnicamente, una sola persona podría comprar los 40 asientos de un bus, uno por uno, sin que el sistema lo impida ni lo detecte. Se construye junto con el ítem 29 -- cuando exista compra multi-pasajero real, se le pone un tope razonable (propuesta: 10, mismo límite que ya existe hoy en el campo del buscador, `max={10}`, ya validado en el código).
31. **Ida y vuelta** -- **NO EXISTE**, confirmado con búsqueda exhaustiva en TODO el proyecto (backend + frontend): cero coincidencias de `idaYVuelta`, `ida_vuelta`, `roundTrip`, `round_trip`, `fechaRegreso`, `fechaVuelta`. Hoy son 2 búsquedas y 2 compras completamente separadas y desconectadas, sin descuento combinado. Requiere trabajo real de backend (relacionar 2 viajes en una compra) -- su alcance técnico exacto se investiga antes de construir.
~~32. Compra como invitado (sin crear cuenta)~~ -- ver decision confirmada y detallada en la Fase 7, item 31 (misma numeracion oficial, evita duplicidad).

**Investigación comparativa completa realizada (07-ago-2026)** contra redBus, ClickBus, FlixBus, Busbud, Wanderu, Rome2Rio, CheckMyBus, Booking.com y Skyscanner, con reporte completo de brechas priorizadas en 3 categorías (esencial / ventaja competitiva / cosmético) -- documento aparte, referenciar para la priorización de las próximas fases después de cerrar los 4 huecos críticos de arriba. Hallazgos principales: rastreo en vivo del bus, contenido de descubrimiento en portada (rutas disponibles/populares con precio real, no inventado sin datos), wallet/cashback tipo ClickBus, reseñas de texto verificadas por viaje completado (hoy solo existe promedio numérico).

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
~~21. Accesibilidad~~ -- **cerrado por completo 07-ago-2026.** Parte 1 (06-ago-2026, PRs #50/#51): contraste WCAG AA y etiquetas del buscador principal, portada 90→100/100 en Lighthouse. **Parte 2 (07-ago-2026, PRs #53/#54):** las 117 etiquetas reales restantes en 24 archivos conectadas con `htmlFor`/`id` -- con 3 casos de diseño real encontrados y resueltos con cuidado (no una aplicación mecánica): (1) etiquetas dentro de listas repetidas (`.map()`) reciben un `id` único por fila (ej. rutas, credenciales API), nunca un `id` fijo; (2) etiquetas que describen un GRUPO de controles (días de la semana, amenidades, rango de horas, código OTP de 6 casillas) usan el patrón `role="group"` + `aria-labelledby`, no `htmlFor` forzado a un solo campo; (3) el componente `SelectorCiudad` (usado 2 veces en la misma pantalla, Origen y Destino) usa `useId()` de React en vez de un `id` fijo, para no chocar entre sus propias instancias. `CampoPassword` se extendió para aceptar un `id` opcional, ya que se reutiliza en 4 pantallas distintas.

**Incidente real durante la construcción, con causa raíz y corrección documentadas:** al aplicar el lote de `panel-empresa/configuracion/page.tsx`, se usó una copia del archivo que resultó estar desactualizada (de antes de que se fusionara el ítem 10, actualización periódica de datos legales) -- mismo tipo de error ya ocurrido antes en la sesión con `enums.ts` y `panel-empresa.ports.ts`, esta vez alcanzando a fusionarse a `main` y desplegarse en producción real antes de detectarse. Detectado por el propio director al revisar el resumen de líneas cambiadas del `git pull` (174 líneas en un archivo donde solo se esperaban ~6) -- confirma el valor real de revisar cada `git pull`/diff con atención, no solo confiar en que "CI pasó". Corregido en PR #54: la funcionalidad completa de Datos Legales restaurada, verificada visualmente en producción real con una cuenta de prueba (con 2FA activado de verdad, no solo en el código).

~~22. Catálogo cerrado de entidad financiera para métodos de pago~~ (ítem nuevo, no estaba en la hoja de ruta original de 27 -- nació de la conversación de pagos de esta sesión) -- **cerrado 06-ago-2026** (PR #52). Hallazgo del usuario: el pasajero debe VER el banco receptor de una transferencia (reconocimiento visual = confianza y velocidad de elección), no solo texto libre. Investigado antes de construir: (1) el nombre del banco vivía sin estructura dentro de un JSON libre -- "Pichincha" y "Banco Pichincha" no se relacionaban entre sí, imposible mostrar el logo correcto con certeza; (2) el `<select>` HTML nativo no permite imágenes en sus opciones -- limitación real del navegador, no del código; (3) **cuestión legal investigada, con matiz importante aportado por el director:** mostrar el NOMBRE de un banco como identificador de la cuenta receptora de una transferencia real es uso operativo estándar (mismo criterio que cualquier factura/comprobante en Ecuador), no publicidad ni endoso -- bajo riesgo. Mostrar su LOGO en ese mismo contexto probablemente cae en la misma categoría de bajo riesgo, pero **queda pendiente de confirmación con un abogado ecuatoriano real** antes de publicarlo, con esta distinción exacta anotada para cuando se retome: "identificar la cuenta receptora de un pago real" (bajo riesgo) contra "logo usado como publicidad o endoso" (alto riesgo) -- son usos legalmente distintos y no deben tratarse igual. **Construido:** catálogo cerrado (8 bancos más grandes de Ecuador por activos + 2 cooperativas de ahorro conocidas + "otro" como respaldo con texto libre, para no bloquear a ninguna cooperativa), obligatorio para transferencia_bancaria, columna estructurada nueva en base de datos. **Pendiente para cuando se confirme lo legal:** mostrar el logo real de cada entidad en el frontend -- hoy se muestra el nombre

### Fase 4 — Conexiones externas reales (bloqueadas por decisiones/gestiones externas al desarrollo)
23. Pasarela de pago con tarjeta real (esperando decisión de proveedor)
24. Proveedor certificado de facturación electrónica (esperando gestión externa)

### Fase 5 — Infraestructura
~~25. Ejecutar despliegue real a Render + Vercel~~ -- **cerrado 07-ago-2026, verificado de punta a punta con datos reales.** Base de datos Postgres real en Render (PostgreSQL 16, plan Free -- expira a los 90 días, sin respaldos hasta pasar a plan pago, documentado explícitamente para no operar así con pasajeros reales). Backend NestJS real en Render (plan Free), con las 5 variables de entorno reales (JWT_SECRET y TOTP_CIFRADO_CLAVE generados nuevos, nunca los de prueba). Frontend Next.js real en Vercel, conectado al backend real vía NEXT_PUBLIC_API_URL.

**2 hallazgos reales de arquitectura descubiertos durante el despliegue, no antes (solo se manifiestan en un entorno gestionado real, no en local):**
1. **RLS con bypass real:** el usuario que Render provee no es superusuario y no tiene ni puede recibir el atributo `BYPASSRLS` (regla dura de PostgreSQL, confirmada con documentación oficial) -- la migración manual 001 (que le da `BYPASSRLS` a `ticketya_platform_admin`) no se puede aplicar en Render. Resuelto sin debilitar la seguridad: el usuario administrador que Render sí entrega es dueño de todas las tablas, y por diseño de PostgreSQL el dueño de una tabla bypasea RLS sin necesitar el atributo explícito (confirmado: el esquema nunca activa `FORCE ROW LEVEL SECURITY`). `DATABASE_URL_PUBLICO` en producción usa ese usuario dueño en vez de `ticketya_platform_admin` -- mismo resultado práctico, camino distinto. Verificado con una consulta real contra la base de datos de Render.
2. **`NODE_ENV=production` omite las dependencias de desarrollo por defecto** de `npm install`, incluyendo `@nestjs/cli` (el comando `nest build` necesario para compilar) -- corregido con `--include=dev` en el comando de construcción de Render.

**Datos reales de prueba creados en producción** (cooperativa, ruta Quito-Guayaquil, viaje) para verificar el sistema completo -- confirmado visualmente en el navegador: la búsqueda real en el frontend de Vercel devuelve el punto de operación real creado en la base de datos real de Render, a través del backend real.

**Pendiente, explícito:** el dominio real de Columbus se compra al final, cuando el proyecto esté completamente terminado y probado (decisión del director) -- por ahora se usan las direcciones gratuitas de Render/Vercel. Ambos planes (base de datos y backend) siguen en el nivel gratuito -- suficiente para seguir probando, pero se necesita subir a un plan pago antes de operar con pasajeros y dinero reales.
26. Prueba de carga real

### Fase 6 — Frontend y marca (al final, ya acordado)
~~27. Rebrand completo a "Columbus" en `apps/web`~~ -- **cerrado 07-ago-2026** (PR #55): 5 apariciones reales de texto visible corregidas (título de pestaña, portada, login, placeholders de webhook), más el prefijo técnico interno `@ticketya/` a `@columbus/` en los 3 paquetes del monorepo (api, db, web) -- decisión del director de hacerlo ya, de una sola vez. Verificado con `turbo run typecheck` desde la raíz (los 3 paquetes completos, no uno por uno) y 170/170 pruebas e2e, cuya propia salida ya mostraba `@columbus/api` en vez de `@ticketya/api` -- confirma que el cambio es real. Dejado explícitamente sin tocar, por decisión del director: nombre del repositorio en GitHub (se cambia al final, antes del lanzamiento real), correos de prueba `@ticketya.ec` en archivos de pruebas automatizadas, y el dominio de marcador de cuentas anonimizadas `@ticketya.invalido` (cumplimiento LOPD) -- ninguno visible al usuario real.

~~28. Diseño visual final de la landing~~ -- **cerrado 07-ago-2026, verificado en producción real** (PR #56). Nueva paleta de marca Columbus (negro/amarillo/blanco), reemplaza el morado heredado del prototipo original. Colores medidos con precisión real del logo oficial (muestreo de píxeles, no a ojo): amarillo `#ffd425` (color dominante confirmado), negro puro `#000000`. La paleta completa del proyecto vive centralizada en un solo archivo (`globals.css`, Tailwind v4 basado en CSS) -- confirmado sin ningún color fijo "escapado" en ningún componente antes de aplicar el cambio, lo que permitió que se propagara a toda la aplicación con una sola edición. Mapeo de variables: `brand`/`brand-dark` se quedan en negro (mantiene el patrón ya existente en cientos de lugares de "botón oscuro + texto blanco", evita romper el contraste WCAG recién corregido en el ítem 21 -- un botón amarillo con texto blanco habría fallado); `brand-medium` pasa a ser el amarillo real (acentos, hover, foco); `brand-light` un crema muy claro derivado; `brand-amber` sin cambios.

**Hallazgo real durante la construcción:** 3 apariciones adicionales de "TicketYa" que la búsqueda de texto original nunca detectó, porque el nombre vivía partido en 2 nodos de JSX distintos (`Ticket<span>Ya</span>`) para poder pintar cada mitad de un color -- nunca existían como una sola cadena de texto en el código fuente. Encontradas por inspección visual real (una captura de pantalla mostró "TicketYa" en el encabezado después de que la búsqueda de texto ya había dado "0 coincidencias") en `HeaderPublico.tsx`, `admin/layout.tsx` y `panel-empresa/layout.tsx`. Corregidas y verificadas visualmente en las 3 pantallas (portada, login, servidor local) antes de fusionar.

**Verificación final en producción real, no solo en código:** confirmado con captura de pantalla real de `columbus-frontend-two.vercel.app` (la URL de producción real, distinta de la URL de un despliegue congelado que causó una confusión real durante la verificación) -- paleta negro/amarillo/blanco y nombre "Columbus" correctos y en vivo.

---

### Fase 7 -- Funciones centrales de compra, nueva, 07-ago-2026 -- NO NEGOCIABLE, antes de cualquier otra cosa

**Pieza previa (prioridad del director, insertada antes de construir el item 29) -- ~~portada con rutas disponibles reales + filtro de buscador de terminales~~ -- cerrada 07-ago-2026, verificada en produccion real (PR #57).** Endpoints nuevos `GET /rutas-disponibles` y `GET /estadisticas-publicas` -- datos 100% reales (tabla `rutas`, conteo de cooperativas con estado `aprobada`), decision explicita de mostrar "rutas disponibles" en vez de "populares" (no existen datos reales de demanda todavia en produccion). Filtro nuevo en `buscarPuntosOperacion` (`tieneRutaReal`, EXISTS contra la tabla `rutas`): el autocompletado de terminales ya no muestra puntos sin ninguna ruta real configurada -- hallazgo real confirmado con el codigo antes de corregirlo, evita que un pasajero elija una sugerencia valida y termine en "0 resultados" sin explicacion. Verificado con evidencia real: script directo contra el backend de produccion (ruta Quito-Guayaquil real, $12.00, 2 cooperativas activas) y codigo fuente real de `columbus-frontend-two.vercel.app` confirmando el HTML servido. Fotos reales y testimonios quedan **pendientes, fuera de este cierre** -- sin infraestructura de subida real de archivos ni licencia de fotos genericas resuelta, decision de negocio pendiente del director, no tarea de codigo simple.

~~29. Compra multi-pasajero e ida y vuelta~~ -- **CERRADO 11-ago-2026, unificados en un solo trabajo de construccion (hallazgo real confirmado: el backend nunca distinguio entre "varios pasajeros, mismo viaje" y "mismo(s) pasajero(s), 2 viajes distintos"), verificado con `tsc` limpio, `next build` 29/29 paginas, y 170/170 pruebas e2e -- sin ningun cambio de backend en las 3 pantallas construidas (PRs #58, #59).**

**Compra multi-pasajero (PR #58):** la pantalla de asientos permite elegir varios (hasta 10, mismo tope que "Pasajeros" del buscador), re-bloqueando todos en cada paso para mantener su tiempo de expiracion sincronizado. El checkout pide los datos de cada pasajero elegido por separado, cada uno con su propio `viajeId`.

**Ida y vuelta (PR #59):** investigado con fuentes reales (AbhiBus/redBus, Wanderu) antes de construir -- confirmado que el estandar de la industria es un interruptor "Solo ida / Ida y vuelta" en el buscador desde el inicio, pidiendo ambas fechas de una vez, no agregando la vuelta despues. Flujo real de 3 pantallas: (1) buscador con el interruptor y fecha de vuelta condicional; (2) pagina de resultados que busca los 2 tramos en paralelo cuando aplica, mostrando un indicador "1. Ida -> 2. Vuelta"; (3) seleccion de asientos y checkout conectados entre ambos tramos.

**Hallazgo real durante la construccion, corregido antes de fusionar:** el primer diseño de la pantalla de resultados tenia un hueco -- al elegir "Elegir asiento" en el tramo de ida, saltaba directo a buscar la vuelta SIN dejar elegir el asiento de ida en absoluto. Corregido: ahora sí lleva al mapa de asientos real del tramo de ida, y solo despues de confirmarlo vuelve a buscar la vuelta, llevando consigo el viaje y los asientos de ida ya bloqueados. Al terminar de elegir el asiento de vuelta, se re-bloquean tambien los de ida (renovando su tiempo de expiracion, por si paso rato buscando) y se va a un checkout que combina ambos viajes -- cada pasajero de la lista final lleva su propio `viajeId`, distinguiendo "Ida"/"Vuelta" visualmente cuando aplica.

30. Limite de asientos por compra -- **cerrado junto con el 29** (PR #58): tope de 10, mismo limite ya usado en el campo del buscador.
31. Compra como invitado -- **CERRADO (11-ago-2026, PR pendiente de fusionar).** Decision investigada contra las 2 plataformas de bus mas grandes del mundo antes de decidir. redBus confirma explicitamente en sus propias preguntas frecuentes que "no requiere que sus clientes pasen por un proceso de registro" -- distingue "usuario registrado" de "invitado (usuario no registrado)" como 2 caminos igual de validos en sus terminos y condiciones. FlixBus documenta su flujo oficial como "elige tu conexion, ingresa la informacion del pasajero, elige tu metodo de pago, y paga" -- sin ningun paso obligatorio de cuenta en medio. **Diseno confirmado para Columbus, siguiendo el mismo patron real:** el checkout pide los datos necesarios del pasajero (nombre, documento, telefono/correo para el boleto y las notificaciones) directo en el formulario, SIN crear una cuenta con contrasena obligatoria. Crear cuenta permanente queda como algo opcional, ofrecido despues de completar la compra ("¿quieres guardar tus datos para tu proxima compra?"), nunca como barrera antes de pagar. **Sobre el contador de usuarios (pregunta real del director, resuelta):** "boletos vendidos" y "usuarios registrados" quedan como 2 metricas distintas a proposito -- toda compra de invitado suma a boletos vendidos, pero solo suma a usuarios registrados si la persona elige crear cuenta. Mismo comportamiento real que redBus y FlixBus.

**Alcance tecnico real, mas grande de lo estimado al principio (2 hallazgos durante la construccion, no solo el checkout final):**
- **Hallazgo 1:** el candado no estaba solo en `/compras` -- tambien estaba en el bloqueo de asientos (`/viajes/:id/asientos/:numero/bloquear`), un paso completo ANTES del checkout, con su propio `@UseGuards(JwtAuthGuard)` documentado a proposito en el codigo.
- **Hallazgo 2:** no existia ningun lugar para guardar el telefono/correo de alguien sin cuenta -- las notificaciones (recordatorio 24h, aviso de llegada, solicitud de calificacion, cambios operativos) sacaban el telefono solo de `usuarios` via `comprador_usuario_id`.

**Backend construido:**
- Migraciones `0026` (telefono_contacto/correo_contacto en `compras`) y `0027` (hold_sesion_invitado_id en `viaje_asientos`) -- aplicadas en produccion y en la base local de pruebas.
- `OptionalJwtAuthGuard` nuevo (`presentacion/auth/guards/optional-jwt-auth.guard.ts`) -- nunca bloquea la peticion, deja `req.user` en `null` sin token en vez de lanzar 401.
- Aplicado a `/compras` y a `/viajes/:id/asientos/:numero/bloquear`.
- Un invitado se identifica por una `sesionInvitadoId` (UUID generado en el navegador, mismo patron que `idempotencyKey`) en vez de una cuenta -- nunca se llenan `hold_usuario_id` y `hold_sesion_invitado_id` a la vez.
- Las 4 consultas de notificaciones que usaban `JOIN usuarios` pasaron a `LEFT JOIN` + `COALESCE(u.telefono, c.telefono_contacto)`, para no perder en silencio las notificaciones de invitados.
- Los creditos de reprogramacion siguen exigiendo cuenta real (un invitado no puede tener ninguno que gastar) -- rechazo explicito, no un vacio silencioso.
- **Alcance limitado a proposito:** los metodos de pago manuales (transferencia, etc.) siguen exigiendo cuenta -- implican volver despues a subir un comprobante, un flujo que merece su propio diseno para invitados, no resuelto en esta pieza.

**Frontend construido:**
- `lib/auth.ts`: `obtenerOCrearSesionInvitado()` -- misma sesion reutilizada en todo el flujo del mismo navegador.
- Pagina de asientos: ya no redirige a `/ingresar` -- bloquea con `sesionInvitadoId` si no hay token.
- Pagina de checkout: ya no redirige a `/ingresar` -- muestra campos de telefono/correo cuando no hay sesion, exige al menos uno antes de continuar.

**Verificado con certeza:** 171/171 pruebas e2e en verde (170 + 1 nueva, la prueba vieja que exigia 401 sin token se actualizo para reflejar la decision real), `tsc --noEmit` limpio en las 3 partes (db, api, web), `nest build` limpio, `next build` con las 29 paginas generadas sin error.

**Confirmado, verificado con evidencia real (07-ago-2026): el selector de tipo de tarifa (adulto/nino/tercera edad -- 50% descuento/discapacidad -- descuento segun carnet CONADIS) YA esta construido y funcionando en el checkout real, con la logica de autorizacion de menores incluida -- NO es un hueco, cumple con la exigencia legal ecuatoriana (LOTTTSV Art. 79). Se verifico esto explicitamente porque el director lo pregunto directo, sin asumir nada -- mismo criterio de honestidad que rige el resto de este documento.**

31.1 Validacion real de datos del pasajero en checkout -- **CERRADO (13-ago-2026, PR pendiente de fusionar).**

**Pedido real del director:** validar el telefono (formato ecuatoriano exacto), separar nombre completo en nombres y apellidos reales, y validar el numero de documento con precision -- mas la pregunta abierta de como manejan las grandes plataformas a las mujeres embarazadas.

**Investigado con evidencia real antes de decidir (mismo criterio de siempre):**
- **Algoritmo oficial de la cedula ecuatoriana (Modulo 10), confirmado con multiples fuentes independientes coincidentes:** 10 digitos, los 2 primeros son el codigo de provincia (01-24), el tercero debe ser menor a 6 para persona natural, y el decimo digito es un verificador matematico real (coeficientes alternados 2,1,2,1,2,1,2,1,2 sobre los primeros 9 digitos, resta de 9 si el resultado de una multiplicacion es >= 10, suma total, verificador = 10 - (suma % 10), o 0 si la suma ya es multiplo de 10).
- **FlixBus confirma explicitamente que acepta pasaporte, cedula/tarjeta de identidad, y licencia de conducir como identificacion valida** -- confirma que limitar el sistema solo a cedula ecuatoriana dejaria fuera a pasajeros extranjeros reales (rutas transfronterizas Ecuador-Colombia/Peru existen).
- **LOTTTSV Articulo 48, texto legal real:** nombra explicitamente a "mujeres embarazadas" junto con discapacidad, adultos mayores de 65, y ninos/adolescentes, pero SOLO para "atencion preferente" -- el mismo articulo, en su propia siguiente frase, limita el "sistema de tarifas diferenciadas" (los descuentos reales) a ninos/adolescentes, discapacidad, y adultos mayores de 65 -- **las embarazadas quedan fuera de la lista de descuento de tarifa a proposito, es un derecho de prioridad/accesibilidad, no un descuento de precio.** Confirmar esto con precision evito un error legal real: mezclar "embarazada" dentro de tipoTarifa (que hoy determina el precio) habria sido incorrecto.

**Decisiones confirmadas por el director:**
- Documento: **selector explicito** (Cedula / Pasaporte) antes de escribir el numero -- no se intenta adivinar el tipo por el formato.
- Cedula: validada con el algoritmo Modulo 10 real. Pasaporte: validacion mas ligera (formato/longitud razonable, sin checksum -- varia por pais).
- Nombre completo: **se separa en 2 campos reales**, `nombres` y `apellidos` -- no un solo campo con validacion de palabras.
- Telefono: formato movil ecuatoriano (10 digitos, empieza con 09) -- el mismo campo que ya se uso para telefonoContacto en el item 31 (compra como invitado).
- Embarazada: **campo nuevo de atencion preferente, separado de tipoTarifa** -- no afecta el precio, es una marca de prioridad (asiento, atencion), consistente con el texto legal real.

**Alcance real investigado antes de comprometerse a construir -- hallazgo importante que evito un error de tamano:** `nombreCompleto` se usa en **41 archivos reales** del repositorio, repartido en 3 esquemas distintos (`usuarios` -- cuenta del usuario, `flota` -- personal/conductores de la cooperativa, `ventas` -- pasajeros del checkout). Tocar los 3 de una vez habria convertido esto en una migracion completa del sistema, no en la mejora de validacion que se pidio. **Alcance confirmado por el director: limitado a los datos del pasajero en el checkout (`pasajeros_compra` + el formulario de compra) -- cuentas de usuario y personal de las cooperativas quedan sin tocar por ahora.**

**Por que se documenta sin construir todavia:** el tamano real termino siendo comparable al item 31 (que ocupo la sesion completa) -- construirlo apurado al final de una sesion ya extraordinariamente larga (multi-pasajero, ida y vuelta, notificaciones, y compra como invitado, todo en el mismo dia) es exactamente cuando empiezan a colarse errores pequenos. Se prefirio cerrar la investigacion con precision y dejar la construccion para una sesion con la cabeza descansada, en vez de forzarla.

**31.1 -- lado frontend, CERRADO (13-ago-2026), PR pendiente de fusionar.** El backend quedo cerrado el mismo dia (commit `6f58442`, PR #63) y el frontend se actualizo de inmediato para no dejar el flujo de compra roto -- el formulario de checkout viejo enviaba `nombreCompleto`, que el backend ya no acepta.

**Cambiado, en `apps/web`:**
- `lib/api.ts`: la interfaz `PasajeroCompraInput` reemplazo `nombreCompleto` por `nombres`, `apellidos`, `tipoDocumento` (`'cedula' | 'pasaporte'`), y agrego `esEmbarazada?: boolean` opcional. Las demas interfaces del mismo archivo que tambien usan `nombreCompleto` (cuentas de usuario, personal de cooperativa) **no se tocaron** -- mismo alcance limitado que ya confirmo el director para el lado backend.
- `checkout/page.tsx`: el campo unico "Nombre completo" se reemplazo por 2 campos (Nombres / Apellidos, en una grilla de 2 columnas), se agrego un `<select>` explicito Cedula/Pasaporte (con la etiqueta del campo de documento cambiando segun cual este elegido), y un checkbox "¿Viaja embarazada? -- atencion preferente, no afecta el precio", ubicado como bloque visual separado del selector de tarifa, justo debajo -- nunca mezclado con `tipoTarifa`.

**Manejo del error real de cedula -- confirmado que no hizo falta escribir ninguna validacion nueva en el frontend.** El `catch` de la funcion `pagar()` ya capturaba cualquier error que lanzara `crearCompra()`, y `crearCompra()` ya construye el `Error` con el mensaje real que devuelve el backend (`throw new Error(mensaje ?? ...)`). El mensaje `"El numero de cedula no es valido (verifica los digitos)."` llega tal cual al `{error && <p>...}` del formulario -- el frontend nunca reimplementa el Modulo 10, solo muestra lo que el backend ya valido.

**Verificado, con una base de datos Postgres real levantada desde cero para esto (no simulado):** 31 migraciones aplicadas en orden (0000 a 0030, incluida `0030_item31_1_validacion_pasajero.sql`), `tsc --noEmit` limpio en `apps/web` y `apps/api`, `next build` 29/29 paginas, y **171/171 pruebas e2e** -- mismo numero de referencia que el backend.

31.2 Correccion real del acceso del admin de plataforma (BYPASSRLS) -- **CERRADO (12-ago-2026), decision del director: "esto debe desarrollarse de manera profesional, como una plataforma SaaS de primer nivel" -- ambas correcciones juntas, no partidas.**

**Hallazgo real pendiente desde antes:** la migracion manual `001_bypass_rls_admin.sql` (que intentaba `ALTER ROLE ticketya_platform_admin BYPASSRLS`) fallaba en produccion con "permission denied to alter role". Investigado con precision: Postgres exige que **solo un rol que YA tiene BYPASSRLS puede otorgarlo** -- ni el dueno de la base, ni CREATEROLE, sirven para esto. Verificado directo contra produccion: ni `columbus_produccion_user` (el usuario de conexion) ni `ticketya_platform_admin` tenian `rolbypassrls = true`. El unico rol con ese privilegio real es `postgres`, el superusuario interno de Render, al que no tenemos acceso -- confirmado que Render no expone ningun usuario con BYPASSRLS de fabrica.

**Correccion real aplicada, sin depender de ningun superusuario:** en vez de un atributo de rol que nunca vamos a poder otorgar, se agrego una excepcion explicita dentro de cada politica RLS misma -- `current_user = 'ticketya_platform_admin' OR <filtro de cooperativa de siempre>`. Postgres ya sabe con que rol se autentico cada conexion, asi que no hace falta ninguna variable de sesion nueva ni cambio de codigo en la aplicacion. Se actualizaron los 2 fragmentos SQL centralizados (`filtroCooperativaActual` y `filtroCooperativaActualOGlobal` en `packages/db/schema/rls.ts`), que se propagan automaticamente a las 11 tablas reales que los usan (`boletos`, `conductores`, `credenciales_api`, `reservas_api_externas`, `rutas`, `tipos_vehiculo`, `unidades`, `usuarios`, `viaje_asientos`, `viajes`, `webhooks_log`) -- ademas del rol `platformAdminRole` agregado explicitamente a la lista `to:` de cada politica (antes solo cubria `ticketya_app`).

**Segundo hallazgo real, separado, encontrado en el camino:** `calificaciones` tenia una politica de aislamiento por cooperativa sobrante en produccion, que contradice su propio diseno documentado en el codigo actual (es contenido multi-cooperativa a proposito, sin aislamiento -- el promedio se muestra en la busqueda publica de cualquier cooperativa). Se elimino esa politica sobrante.

**Migracion real:** `0028_admin_plataforma_bypass_rls.sql` -- 11 `ALTER POLICY` + 1 `DROP POLICY`, aplicada y verificada en produccion y en la base local de pruebas. La migracion manual `001` obsoleta se dejo como no-operacion documentada (en vez de borrarla) para no cambiar la numeracion del historial.

**Hallazgo adicional real, no buscado -- 3 migraciones llevaban tiempo silenciosamente sin aplicarse en produccion:** cada corrida anterior de `db:migrar` contra produccion se detenia justo en la migracion `001` (fallaba y abortaba antes de seguir), lo que significa que `manual/002_grants_app_role.sql`, `manual/003_auditoria_inmutable.sql`, y `manual/005_grants_banners_y_default_privileges.sql` **nunca habian llegado a ejecutarse contra produccion** -- quedaban en cola detras de `001`. Al arreglar `001`, las 3 se aplicaron por primera vez hoy.

**Verificacion real de que el sistema de compra NO estaba roto (se comprobo, no se asumio):** antes de dar esto por bueno, se probo en vivo contra produccion -- se bloqueo un asiento real (`POST /viajes/:id/asientos/:numero/bloquear`, sin token, como invitado) contra la base de produccion real, y funciono correctamente (`estado: bloqueado_temporal`). Esto confirma que `ticketya_app` ya tenia sus permisos de escritura fundamentales desde antes por otra via -- las migraciones 002/003/005 solo repitieron de forma inofensiva permisos que ya existian, no repararon un sistema roto. Se investigo con evidencia real en vez de asumir gravedad.

**Verificado con certeza:** 171/171 pruebas e2e en verde (4 fallaron en la primera corrida por datos sobrantes de una prueba anterior en la base local -- `cargo_plataforma_por_pasajero_default` en `0.55` en vez de `0` -- confirmado que no tenia relacion con este cambio, corregido, vuelto a correr limpio), `tsc --noEmit` limpio, `nest build` y `next build` (29 paginas) limpios en el build completo del monorepo.

**Error real propio, encontrado por CI, corregido con urgencia (12-ago-2026):** el `DROP POLICY` de `calificaciones` en la migracion 0028 dejo esa tabla con RLS activo y CERO politicas -- en Postgres eso significa "nadie entra" (excepto el dueno o BYPASSRLS), no "sin restriccion". CI lo detecto de inmediato (una prueba real de calificar un viaje empezo a fallar con "new row violates row-level security policy"), y se confirmo que **esto ya estaba roto en produccion en vivo** antes de fusionar nada -- ninguna calificacion nueva se podia guardar. Corregido con la migracion `0029_fix_calificaciones_sin_rls.sql` (`ALTER TABLE calificaciones DISABLE ROW LEVEL SECURITY`, la forma correcta de expresar "sin aislamiento" en vez de dejar RLS activo sin ninguna politica), aplicada de inmediato a produccion y verificada con una consulta directa antes de continuar. Es exactamente el tipo de error que CI existe para atrapar -- se dejo pasar por las pruebas locales porque la prueba de calificaciones habia pasado ANTES del `DROP POLICY` en una corrida separada, no despues del cambio completo junto.

**Construido y verificado (13-ago-2026):**

**Backend:**
- Nuevo enum `tipo_documento` (cedula/pasaporte) y archivo `dominio/ventas/validadores-documento.ts` con las funciones puras reales: `esCedulaEcuatorianaValida` (algoritmo Modulo 10 completo), `esPasaporteValido` (formato ligero), `esTelefonoEcuadorMovilValido` (10 digitos, empieza con 09).
- `pasajeros_compra`: `nombreCompleto` separado en `nombres` + `apellidos` reales, mas `tipoDocumento` y `esEmbarazada` -- migracion `0030_item31_1_validacion_pasajero.sql`, con relleno seguro de filas existentes (heuristica de division de nombre) antes de volver las columnas obligatorias. Aplicada y verificada en produccion (tabla vacia, migracion trivial) y en la base local de pruebas (127 filas reales, todas migradas sin nulos).
- `PasajeroCheckoutDto`: validador de clase `EsDocumentoValidoSegunTipoConstraint` que aplica el algoritmo correcto segun `tipoDocumento` declarado explicitamente por el pasajero -- nunca se adivina el tipo por el formato.
- Telefono (`telefonoContacto` del item 31, y `adultoResponsableTelefono` de autorizacion de menor) validados con el formato movil ecuatoriano real.
- Actualizados todos los consumidores reales dentro del alcance (`checkout.service.ts`, `compra.repositorio.drizzle.ts` incluida reprogramacion, `calificaciones.repositorio.drizzle.ts`, `panel-empresa.repositorio.drizzle.ts` con 2 consultas SQL crudas corregidas) -- los que solo MUESTRAN el nombre reconstruyen `nombres || ' ' || apellidos` al leer, sin cambiar lo que esos endpoints devuelven hacia afuera.
- **Alcance confirmado, sin tocar:** cuentas de usuario y personal de cooperativas -- ambos siguen usando su propio `nombreCompleto`, intencionalmente, tal como se decidio antes de construir.

**Pendiente real, no resuelto en esta pieza -- coordinacion necesaria:** el formulario de compra del frontend (construido en el item 31) todavia envia `nombreCompleto` como un solo campo -- con este cambio, el backend ya no lo acepta. Es un cambio que rompe el flujo de compra real hasta que el frontend se actualice para enviar `nombres`, `apellidos`, `tipoDocumento`, y opcionalmente `esEmbarazada`. Reportado explicitamente a la conversacion de frontend al cerrar esta pieza.

**Verificado con certeza:** 171/171 pruebas e2e en verde (32 registros de pasajero en 6 archivos de prueba reales actualizados al nuevo formato, con cedulas de prueba reales generadas y verificadas con el mismo algoritmo Modulo 10), `tsc --noEmit` limpio, `nest build` y `next build` (29 paginas) limpios en el build completo del monorepo, migracion aplicada y verificada con consulta directa en produccion.

### Fase 8 -- Hallazgos nuevos del director, 11-ago-2026, pendientes de construir

**Confirmado ya construido, verificado con evidencia real:** notificaciones de confirmacion de compra y recordatorio de viaje (WhatsApp, ver 3.12) -- SI existen. Limite real de esta verificacion: no se confirmo el detalle fino de cuantos avisos manda ni con que anticipacion exacta (ej. si manda uno la noche antes Y otro la manana del viaje, o solo uno) -- pendiente de revisar el codigo real antes de asumir cualquier cosa.

~~32. Notificacion al abordar / cerca de llegar a destino~~ y ~~33. Notificacion automatica pidiendo calificacion~~ -- **CERRADOS 11-ago-2026 (PR #60, commit eb40372).** Investigado el patron real primero (notificaciones-programadas.service.ts, RF-NOTIF-002): el recordatorio de viaje existente es UN SOLO aviso via @Cron(EVERY_HOUR) con ventana movil de 24h, nunca 2 avisos separados como se sospechaba -- misma arquitectura reutilizada para los 2 crons nuevos. Item 32: @Cron(EVERY_10_MINUTES), ventana de 20 min antes de hora_llegada_estimada, solo boletos 'usado'. Item 33: @Cron(EVERY_HOUR), viajes 'finalizado' con 30 min de colchon despues de la llegada, mismo filtro de boletos 'usado' (evita pedir calificacion a quien nunca abordo). Verificado con tsc limpio y 170/170 pruebas e2e.

**Hallazgo real critico durante la construccion, resuelto:** `drizzle-kit generate` esta roto para este proyecto -- su archivo de seguimiento interno (`migrations/meta/_journal.json`) quedo congelado en la migracion 0000 desde hace mucho tiempo, sin registrar nunca las migraciones 0002-0024 reales. Al generar la migracion del enum nuevo, produjo un archivo catastrofico que intentaba recrear decenas de tablas/columnas ya existentes -- detectado y descartado ANTES de aplicarlo a cualquier base de datos. Causa real: este proyecto aplica migraciones con su propio script (`scripts/aplicar-migraciones.cjs`, registro propio en tabla `_migraciones_aplicadas`), no con el comando estandar de drizzle-kit -- por eso su journal interno nunca se mantuvo actualizado, sin que esto haya causado ningun problema real hasta ahora. Migracion real y minima (`0025_item32_33_notificaciones.sql`, solo 2 sentencias ALTER TYPE) escrita a mano en su lugar, siguiendo el patron ya usado en el proyecto. **Reparar `drizzle-kit generate` de fondo queda pendiente, tarea aparte, no bloqueante.**

**Migracion 0025 APLICADA a produccion real y verificada 11-ago-2026** -- confirmado con consulta directa a `pg_enum` en la base de datos real: los 5 valores del enum `tipo_notificacion` existen, incluidos `aviso_llegada` y `solicitud_calificacion`. Los items 32 y 33 estan completos de punta a punta: codigo fusionado + migracion aplicada + verificado contra la base de datos real.

32. Notificacion al abordar / cerca de llegar a destino -- **NUEVO, no existe.** El director pidio: aviso cuando el pasajero esta por llegar a su destino, recordandole recoger sus pertenencias. Extiende el sistema de notificaciones ya existente (mismo canal WhatsApp) -- tamaño real pequeño, no requiere arquitectura nueva. Pendiente investigar alcance tecnico exacto (¿que evento dispara el aviso? ¿tiempo antes de la hora de llegada estimada, o basado en ubicacion GPS real -- que hoy casi ninguna unidad tiene conectado, ver item 16?).

33. Notificacion automatica pidiendo calificacion al terminar el viaje -- **NUEVO, no existe.** La funcion de calificar ya existe (el pasajero puede hacerlo por su cuenta), pero no hay evidencia de que se le avise automaticamente para que lo haga. Extiende el mismo sistema de notificaciones -- tamaño real pequeño.

34. Enlace a Airbnb (buscar hoteles en destino) -- **DECISION DE NEGOCIO CONFIRMADA (11-ago-2026), alcance simple, construccion pendiente.** Es un link externo simple (el pasajero hace clic y se abre Airbnb en una pestana nueva) -- NO es una integracion real con la API de Airbnb, sin busqueda ni reservas dentro de Columbus. Ubicacion confirmada en el flujo: se pregunta activamente ("¿Necesitas hospedaje en [ciudad destino]?") justo en la pantalla de confirmacion de compra, momento donde ya se conoce la ciudad destino y la fecha del viaje.

35. Enlace a servicio de transporte/traslado -- **DECISION DE NEGOCIO CONFIRMADA (11-ago-2026), servicio real identificado, alcance geografico inicial definido, construccion pendiente.** Se conecta con **Zego**, plataforma de transporte propia que el director va a desarrollar por separado (no es Uber/Cabify/InDriver ni ningun servicio de terceros -- Zego es un desarrollo propio, futuro, fuera del alcance de este repositorio). **Alcance geografico inicial: SOLO Machala** (ciudad donde arranca la operacion) -- no se ofrece en otras ciudades hasta que la operacion este probada ahi primero. Ubicacion confirmada en el flujo, con 2 momentos distintos (no uno solo):
- **Tramo 1 (antes de salir de casa):** se pregunta activamente ("¿Necesitas transporte hasta la terminal el dia de tu viaje?") en la misma pantalla de confirmacion de compra, junto con la pregunta de Airbnb -- solo si el ORIGEN del viaje es Machala.
- **Tramo 2 (al llegar a destino):** se pregunta activamente ("¿Necesitas transporte desde la terminal hasta tu destino final?") en el mismo momento del aviso de llegada nuevo (item 32) -- solo si el DESTINO del viaje es Machala.

**Nota tecnica real a considerar cuando se investigue el alcance:** como Zego es un desarrollo propio y separado, se necesitara definir como Columbus se comunica con Zego (deep link simple con parametros de ubicacion/hora, o una integracion mas real via API propia) -- eso todavia no esta decidido, queda para cuando Zego este mas avanzado.

**Principio confirmado por el director para estos 2 ultimos (items 34, 35) y cualquier integracion futura similar:** Columbus es SaaS multi-cooperativa por diseno desde el origen (no un sistema para una sola empresa que se hizo escalable despues) -- cualquier integracion nueva debe construirse generica, para que cualquier cooperativa que se registre la aproveche igual, sin trabajo adicional por cooperativa.

---

## 6. Regla de mantenimiento de este documento

Este documento se actualiza al cierre de cada sesión de trabajo real donde algo cambie de estado — no solo cuando se pida explícitamente. **Ninguna construcción nueva empieza sin que la decisión ya esté escrita aquí y confirmada primero (regla reforzada 2-ago-2026, ver sección 5).** **REGLA NO NEGOCIABLE (07-ago-2026): ningún ítem se marca "completo" sin responder primero "¿qué le falta comparado con las mejores plataformas del mundo?".** Ningún resumen de conversación ni memoria de sesión reemplaza esto como fuente de verdad. Antes de escribir código nuevo, se consulta este documento primero.
