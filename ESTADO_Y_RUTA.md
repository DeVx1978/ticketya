# TicketYa — Estado del proyecto y ruta de trabajo por fases

**Última actualización:** 21 de julio de 2026 (Panel Empresa completado al 100%)
**Repositorio:** https://github.com/DeVx1978/ticketya (privado)
**Último commit subido:** `db49354` — "paso 6: validar boleto por QR, probado con boleto real"

Este documento es el punto de partida para cualquier sesión de trabajo
futura — reemplaza la necesidad de "memoria". Está basado en 4 documentos
de mayor autoridad:

1. `TicketYa_SRS_v1.3` — Especificación de Requerimientos.
2. `TicketYa_Arquitectura_Tecnica_v1.0` — Stack y decisiones técnicas.
3. `TicketYa_Auditoria_Estado_Proyecto_v1.1` — Auditoría verificada del código real.
4. Este documento — estado de avance día a día y próximos pasos.

---

## ⚠️ PROTOCOLO DE VERIFICACIÓN — OBLIGATORIO, SIN EXCEPCIÓN

*(sin cambios respecto a la versión anterior — ver commit `0ba476f` para el
texto completo. Resumen: nunca declarar algo resuelto solo porque un
comando no tiró error; verificar contenido real con `Select-String` o
`git --no-pager show HEAD:archivo`; probar primero en el entorno de
Claude, luego repetir en la PC real; nunca confiar en la pestaña
"Problems" de VS Code por encima de la terminal.)*

**Aprendizaje nuevo de esta sesión:** al pedir verificación de contenido,
hay que buscar un texto que realmente viva en el código fuente (nombres
de función, texto de UI escrito literal), no un mensaje que solo existe
en la respuesta del backend en tiempo de ejecución — buscar ese tipo de
texto en el archivo del frontend siempre va a dar "vacío" aunque el
archivo esté perfecto, y genera una alarma falsa.

---

## ✅ Fase 0 — Fundaciones de datos (COMPLETADA)
## ✅ Fase 1 — Fundaciones de código (COMPLETADA)
## ✅ Fase 2 — Núcleo de venta (MVP) — ciclo completo funcionando, 56 pruebas automatizadas
## ✅ PANEL EMPRESA — COMPLETADO AL 100% (backend + frontend + pruebas + verificado en vivo)

Las 5 pantallas de Panel Empresa están construidas, verificadas en código
(ESLint + TypeScript + build de producción) y probadas en vivo con datos
reales usando Playwright, con capturas de pantalla confirmando cada una:

| Pantalla | Qué hace | Verificado en vivo con |
|---|---|---|
| Panel (dashboard) | Ventas de hoy, resumen y detalle por ruta/vendedor | Una venta real de un pasajero, mostrada correctamente ($8.50, 1 boleto) |
| Rutas | Crear y listar rutas (origen, destino, precio base) | Ruta nueva creada por la UI, aparece de inmediato en la lista |
| Unidades | Crear tipos de vehículo y unidades (placa + identificador operativo) | Tipo "Bus doble piso VIP" (52 asientos) y unidad "GYE-9821 / Disco 14" creados y vinculados correctamente |
| Viajes | Programar viajes combinando ruta + unidad + fecha/hora/precio | Viaje real creado; encontrado y corregido un bug real de zona horaria en el camino (ver abajo) |
| Validar boleto | Escanear/pegar código QR para confirmar abordaje | Un boleto real generado de punta a punta (compra de pasajero) y validado dos veces: primera vez válido, segunda vez correctamente rechazado por "ya utilizado" |

**Backend agregado en el camino** (no existía antes de esta sesión): las
5 pantallas necesitaban poder **listar** lo ya creado, no solo crear —
se agregaron `GET /coop/rutas`, `GET /coop/tipos-vehiculo`,
`GET /coop/unidades` y `GET /coop/viajes`, cada uno con su propia prueba
automatizada. El total de pruebas del backend subió de 52 a **56**.

**Bug real encontrado y corregido gracias a la verificación visual (no
se habría visto solo con `tsc`/`eslint`):** la hora de salida de un viaje
se mostraba desplazada varias horas en el Panel Empresa —
`toLocaleTimeString` sin especificar `timeZone` usa la zona horaria del
navegador/servidor, no la de Ecuador. Se corrigió agregando
`timeZone: "America/Guayaquil"` explícito. De paso se confirmó que la
página pública de búsqueda de pasajeros (`app/buscar/page.tsx`) ya tenía
este detalle bien resuelto desde antes — el bug era solo del código
nuevo de esta sesión.

## 🔶 Fase 3 (resto) — Panel Admin: backend confirmado, frontend con solo la pantalla base (sin listas ni formularios todavía)

---

## Hallazgos reales encontrados durante todo el proceso (sin cambios, siguen anotados)

- La respuesta de `/compras` no incluye el precio desglosado por boleto (solo `id` y `codigoQr`).
- No existe ninguna fila en `configuracion_plataforma` — el cargo de plataforma por pasajero cae en $0 por defecto.
- El buscador de ciudades no ordena por relevancia y corta en 10 resultados.
- Bloquear un número de asiento que no existe físicamente en el bus (ej. "ZZ99") hoy se acepta igual.

## 📍 Punto exacto de pausa — empezar aquí la próxima sesión

Con Panel Empresa 100% terminado, el siguiente paso — mismo patrón,
mismo cuidado — es **Panel Admin**:

1. **Cooperativas** — listar las cooperativas afiliadas (el backend
   `GET /admin/cooperativas` ya existe) y crear nuevas desde la interfaz
   (el backend `POST /admin/cooperativas` también ya existe — es la
   misma llamada que se ha usado todo este tiempo por comando para crear
   cooperativas de prueba).
2. **Puntos de operación** — listar y crear terminales/oficinas/paradas
   (el backend `POST /admin/puntos-operacion` ya existe; falta el `GET`
   de listado, igual que pasó con rutas/unidades/viajes — hay que
   agregarlo primero).
3. **Dashboard nacional** — ya tiene una versión mínima funcionando
   (`GET /admin/dashboard`), se puede mejorar visualmente después.

El patrón a seguir es idéntico al que ya funcionó 6 veces seguidas hoy:
revisar si falta el `GET` de listado en el backend → agregarlo con su
propia prueba automatizada → construir la página → verificar código
(ESLint + TypeScript + build) → probar en vivo con Playwright y capturas
reales → entregar en un solo paso reemplazable → verificar en la PC real
→ hacer commit y push.

---

## Decisiones de negocio pendientes (sin cambios, siguen abiertas)

- Comisión de plataforma (RN-003)
- Ventana de bloqueo temporal de asiento (RN-004)
- Política de cancelación/reembolso (RN-005)
- Cuenta bancaria y periodicidad de liquidación del Terminal de Machala
- Nombre exacto del identificador operativo de unidad ("disco"/turno)
- Arquitectura de 3 comprobantes SRI por venta (validar con contador)
- Tarifas de planes comerciales de publicidad
- Credenciales reales de PayPhone/Kushki

## Fases futuras (sin cambios respecto al plan original)

- **Fase 3.5** — Diseño visual final del frontend (sistema ClickBus vía Tailwind, ya en marcha — `app/globals.css` tiene los colores de marca definidos y varias páginas ya los usan).
- **Fase 4** — Piloto real con cooperativa del Terminal de Machala.
- **Fase 5** — RF-API (Modelo B), RF-COMM (publicidad), Kushki, reportes avanzados.
- **Fase 6** — Apps móviles (React Native).
- **Fase 7** — Escala nacional/internacional, expansión a Colombia.
- **Fase 8** — Producto separado de largo plazo (transporte tipo InDrive/Uber).

---

## Nota sobre la forma de trabajo

El director de este proyecto tiene experiencia técnica y prefiere
instrucciones directas, **un solo paso a la vez, con el comando exacto
para copiar y pegar**, sin explicaciones largas antes de actuar. Exige
—correctamente— que nada se declare "normal" o "resuelto" sin evidencia
real y verificada, y que todo lo visual se muestre en vivo (capturas
reales de Playwright, no solo confirmación de que el código compila).
Ver el protocolo de verificación al inicio de este documento.
