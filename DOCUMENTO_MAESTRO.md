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

**Estado real:** ✅ Completo, salvo 2FA.
- Registro con verificación real de correo (token, expira, un solo uso)
- Login, recuperación de contraseña (token con hash SHA-256, expira 30 min)
- Cambio de correo con flujo de doble verificación (correo viejo sigue activo hasta confirmar el nuevo)
- Refresh tokens reales
- Roles: pasajero, vendedor, admin_cooperativa, admin_plataforma

**Falta:** 2FA para cuentas admin_plataforma y admin_cooperativa.

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
- **Comodidades del vehículo (amenidades)**: no existe ningún campo en el tipo de vehículo para declarar qué ofrece (WiFi, baño a bordo, cargadores, reclinables) — dato que las 6 fuentes marcan como decisivo para que el pasajero elija
- **Calificación visible antes de comprar**: ya construimos el sistema de calificaciones post-viaje, pero falta confirmar si esa calificación promedio se muestra al pasajero ANTES de elegir esa cooperativa en los resultados de búsqueda — si no se muestra, el sistema de calificaciones pierde gran parte de su valor real (ayudar a decidir, no solo acumular datos)
- **Seguimiento en vivo del bus (GPS)**: mencionado como diferenciador fuerte en redBus/Abhibus — no existe en nuestro sistema, ni el esquema lo contempla todavía

**Decisiones del director (30-jul-2026):**
- Filtros de búsqueda (hora de salida, tipo de vehículo, amenidades, precio): **✅ aprobado para construir**, prioridad alta
- Amenidades del vehículo: **✅ aprobado**, catálogo cerrado (WiFi, aire acondicionado, baño a bordo, cargadores, asientos reclinables, TV) — no texto libre, mismo criterio que categoría de vehículo
- Calificación promedio visible en resultados de búsqueda: **✅ aprobado**, mejor relación esfuerzo/impacto de toda esta lista — el dato ya existe, solo falta exponerlo
- Seguimiento GPS en vivo: **corregido** — misma lógica del "cableado vs conector" que se corrigió en el Modelo B. Ver detalle abajo, no queda simplemente pausado.

**Aclaración importante (30-jul-2026):** existen dos funciones distintas relacionadas con mapas, que no deben confundirse:
- **Ver trayecto (terminal origen → terminal destino, ruta fija en un mapa)**: **✅ aprobado**, costo bajo — ya se guardan las coordenadas de cada terminal, solo falta el botón en frontend que abra el mapa con esos dos puntos. No depende de ningún hardware de la cooperativa.
- **Seguimiento en vivo (dónde está el bus en este momento exacto, moviéndose)**: separar lo genérico de lo específico, igual que en Modelo B —
  - **El cableado (✅ construir ya):** un endpoint que reciba una ubicación GPS y la guarde, y un mapa en el frontend que la muestre en vivo — esto es genérico, funciona igual sin importar qué cooperativa lo use algún día
  - **El conector (⏸️ sí espera):** que una cooperativa real instale el GPS físico en sus unidades y lo conecte a nuestro endpoint — eso no lo controlamos nosotros, es inversión de cada cooperativa

**Falta:** construir los 3 puntos aprobados de esta sección; endpoint + mapa en vivo para GPS (infraestructura genérica, sin esperar a ninguna cooperativa); cargar coordenadas reales exactas de cada terminal (tarea del dueño del proyecto, vía Google Maps); construir el botón "ver trayecto en Maps" (aprobado, bajo costo); verificar nombres oficiales y provincias exactas de los 22 terminales cargados sin verificación individual.

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

**Falta:** nada identificado en lo ya construido. Nuevo, aprobado: asientos/indicador exclusivo para mujeres.

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

**Falta:** nada identificado en el flujo central. Verificar: descarga de boleto en PDF para acceso sin conexión.

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

**2. Carga masiva de datos operativos — hueco real, confirmado contra la industria (30-jul-2026).** Investigado: la carga masiva de flota (redBus Plus, sistemas CMMS de transporte 2026) es un estándar esperado en plataformas serias de este tipo, no un lujo. Cada unidad ya es única (placa, identificador operativo, distribución de asientos propia por tipo de vehículo) — eso está resuelto. Lo que falta analizar y posiblemente construir:
- **Horarios recurrentes**: hoy cada viaje (fecha + hora + unidad específica) se crea individualmente. Falta una "plantilla de horario" (ej. "todos los lunes 8am con este tipo de bus") que genere los viajes automáticamente día tras día, en vez de crear cada uno a mano — con cientos de salidas diarias a nivel nacional, esto no es viable de otra forma.
- **Verificar si existe importación masiva de datos iniciales** (flota completa, rutas completas) al momento de dar de alta una cooperativa nueva — pendiente de revisar el estado real del archivo correspondiente antes de asumir que existe o no.

**3. Contratiempos operativos (cierre de vía, feriado, paro) — hueco real, no resuelto.** Hoy no existe una acción masiva tipo "cancelar/suspender todos los viajes de esta ruta en esta fecha" — habría que cancelar viaje por viaje a mano, lo cual no es realista en una operación real. Se necesita una herramienta de cancelación/suspensión masiva por ruta y rango de fechas.

**4. Actualización periódica obligatoria de información.** Requerimiento nuevo, no construido: mismo patrón que usan plataformas financieras con revalidación de KYC — la cooperativa debería confirmar/actualizar sus datos legales y de contacto cada cierto tiempo (ej. cada 6-12 meses).

**5. "Nosotros les damos todas las herramientas".** Confirmado: para el Modelo A (panel directo), esto ya es cierto en lo cotidiano — rutas, flota, personal, viajes, precios, métodos de pago, política de cancelación. Para el Modelo B (cooperativas con sistema propio que se conectan por API), la promesa **se cumple para la infraestructura genérica** — cerrado 03-ago-2026, ver sección 3.11.

**Falta:** horarios recurrentes (plantilla de horario); cancelación/suspensión masiva por ruta y fecha; verificar estado real de importación masiva de datos iniciales; actualización periódica obligatoria de datos. Modelo B: cerrado (ver 3.11) -- solo queda lo específico por cooperativa, que espera a la primera integración real.

---

### 3.8 Panel de administrador de plataforma

**Requerimiento completo:** gestión de cooperativas (alta/aprobación), puntos de operación (terminales), configuración global (cargo de plataforma, modo de IVA en boletos), banners promocionales propios.

**Estado real:** ✅ Completo — pero como un solo rol plano (`admin_plataforma`), sin niveles.

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

**Falta:** dividir el rol plano actual en `super_admin` + `admin_plataforma` con la matriz de permisos de arriba; registro de auditoría de acciones administrativas (ninguna línea de código construida todavía, es una decisión de diseño a confirmar antes de tocar el esquema de roles).

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
| Pruebas automatizadas | ✅ 137 pruebas end-to-end locales, ejecución en serie (corregido un riesgo real de falsos negativos por paralelismo). CI verificado con el mismo número (ver 3.13 -- discrepancia anterior era solo una etiqueta de texto vieja, ya corregida). |
| Multi-tenancy (RLS) | ✅ Verificado en vivo — una cooperativa no puede ver datos de otra |
| 2FA | 🔴 No construido |
| Cumplimiento LOPD Ecuador | 🔴 No revisado formalmente |
| `npm audit` | 🔴 Nunca revisado a fondo (se detectaron vulnerabilidades sin resolver en una sesión anterior) |
| Despliegue real (Render + Vercel) | 🔴 Decisión tomada, sin ejecutar — corre solo en local |
| Prueba de carga real | 🔴 Nunca simulada |
| Rebrand a "Columbus" en código real | 🔴 Pendiente, software real sigue diciendo "TicketYa" |
| Accesibilidad (lectores de pantalla, contraste, navegación por teclado) | 🔴 No analizado en ningún momento del proyecto |

**Análisis de prioridad del director (30-jul-2026), no todos estos pesan igual:**

**LOPD Ecuador sube de prioridad — riesgo real, no genérico.** El sistema maneja cédulas de pasajeros adultos, y datos de menores de edad (autorización de viaje acompañado). Estos son categorías de datos con protección reforzada en la mayoría de leyes de protección de datos, incluida la ecuatoriana. Esto no es un "revisar cuando haya tiempo" — es el tipo de incumplimiento que puede generar sanciones reales si se lanza sin revisarlo. Se sube a la Fase 3, primero en su lista, no al final.

**Accesibilidad — hallazgo nuevo, no analizado hasta hoy.** Ninguna sesión de este proyecto la mencionó. Para una plataforma que aspira a ser "la mejor del mercado" y de uso masivo nacional, ignorarla no es neutral — deja fuera a personas con discapacidad visual o motriz de un servicio esencial (transporte). Se agrega como requerimiento nuevo.

**Diferencia CI vs local (137 vs 88) — hallazgo cerrado (2-ago-2026).** Investigado y corregido: era una etiqueta de texto vieja en `ci.yml`, no una diferencia real de cobertura. El CI y el entorno local corren exactamente las mismas 137 pruebas.

---

## 5. Hoja de ruta por fases, derivada de este análisis

**Regla acordada:** funcionalidad backend al 100% primero. Frontend/diseño visual final va al último, después de que todo lo demás esté cerrado.

**Regla reforzada (2-ago-2026):** ninguna construcción nueva empieza sin que la decisión correspondiente ya esté escrita en este documento y confirmada — se escribe primero, se confirma, y recién ahí se construye. Esta regla nace de un descuido real: se discutieron y cerraron decisiones de Modelo B (los 2 hallazgos de esquema, la decisión de autoservicio) en una conversación, pero se avanzó a construir otra pieza (el contador de usuarios) antes de escribirlas aquí — se recuperaron a tiempo porque quedaron en el historial de chat, pero no debe depender de eso nunca más.

**Decisiones pendientes de tu confirmación antes de construir (análisis ya hecho, sección 3):**
- Aviso de cambio de HORA de un viaje ya vendido -- ¿se habilita `editarViaje` para viajes con boletos vendidos (con su propio aviso), o se descarta del alcance de notificaciones? (3.12, hallazgo del 03-ago-2026)
- Horarios recurrentes (plantilla), cancelación/suspensión masiva por ruta y fecha, verificar estado real de importación masiva de flota (3.7)
- Dividir el admin de plataforma en `super_admin` + `admin_plataforma` con la matriz de permisos definida, más registro de auditoría (3.8)

### Fase 1 — Paneles de administración faltantes (backend ya existe, salvo lo indicado)
~~1. Panel de Comercial/Publicidad~~ — **cerrado 30-jul-2026**
~~2. Panel de Liquidaciones (admin) + endpoint nuevo de solo lectura para la cooperativa~~ — **cerrado 30-jul-2026**

### Fase 2 — Funciones nuevas, backend + frontend desde cero
~~3. Contador de usuarios registrados~~ — **cerrado 2-ago-2026**
~~4. Modelo B~~ — **cerrado 03-ago-2026** (ver 3.11): infraestructura genérica completa (esquema, credenciales, despachador de webhooks, recepción, reconciliación, documentación técnica), todo verificado y fusionado a `main`. Lo específico por cooperativa espera a la primera integración real
~~5. Notificaciones automáticas~~ — **cerrado 03-ago-2026** (ver 3.12): WhatsApp como canal principal, recordatorio de viaje y aviso de cambio operativo (unidad) construidos y verificados. Cambio de hora queda pendiente de decisión de producto, no de construcción
~~6. Código de pasajero fijo + límite de frecuencia~~ — **cerrado 03-ago-2026** (ver 3.1.1): decisión confirmada, construido y verificado
7. Horarios recurrentes (plantilla) y cancelación/suspensión masiva por ruta y fecha
8. Verificar y, si falta, construir importación masiva de flota inicial
9. División super_admin / admin_plataforma + registro de auditoría (si se confirma)
10. Actualización periódica obligatoria de datos de cooperativa (si se confirma)
11. Filtros de búsqueda (hora, tipo, amenidades) + campo de amenidades en tipo de vehículo — **aprobado**
12. Exponer calificación promedio en resultados de búsqueda — **aprobado**
13. Descarga de boleto en PDF
14. Asientos/indicador exclusivo para mujeres — **aprobado**, informativo, sin verificación de género en la compra
15. Botón "ver trayecto" (ruta fija terminal origen → destino en un mapa) — **aprobado**, bajo costo, no depende de hardware de cooperativa
16. Seguimiento GPS en vivo — **infraestructura genérica sí entra en construcción activa** (endpoint para recibir ubicación + mapa en vivo en frontend), igual criterio que Modelo B

**Depende de terceros, no se construye con código (aplica a ambos, Modelo B y GPS):**
- Que una cooperativa real instale hardware GPS y lo conecte a nuestro endpoint
- Que una cooperativa real se conecte al Modelo B con su propio sistema

### Fase 3 — Seguridad y cumplimiento de producción
17. **Revisión de cumplimiento LOPD Ecuador — primero de esta fase**, maneja cédulas y datos de menores, riesgo legal real, no genérico
~~18. Investigar la diferencia CI (88) vs local (137) en las pruebas automatizadas~~ — **resuelto 2-ago-2026**, era una etiqueta de texto vieja en `ci.yml`, corregida
19. 2FA para cuentas administrativas
20. `npm audit` a fondo
21. Accesibilidad (lectores de pantalla, contraste, navegación por teclado) — hallazgo nuevo, nunca analizado antes

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
