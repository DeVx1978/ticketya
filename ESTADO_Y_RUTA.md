# TicketYa — Estado del proyecto y ruta de trabajo por fases

**Última actualización:** 20 de julio de 2026 (cierre de la sesión de blindaje del núcleo + limpieza total de errores)
**Repositorio:** https://github.com/DeVx1978/ticketya (privado)
**Último commit subido:** `7b14e99` — "corrige tipos de Jest y baseUrl obsoleto en tsconfig, cero errores en todo el proyecto"

Este documento es el punto de partida para cualquier sesión de trabajo
futura — reemplaza la necesidad de "memoria". Está basado en 4 documentos
de mayor autoridad:

1. `TicketYa_SRS_v1.3` — Especificación de Requerimientos.
2. `TicketYa_Arquitectura_Tecnica_v1.0` — Stack y decisiones técnicas.
3. `TicketYa_Auditoria_Estado_Proyecto_v1.1` — Auditoría verificada del código real.
4. Este documento — estado de avance día a día y próximos pasos.

---

## ⚠️ PROTOCOLO DE VERIFICACIÓN — OBLIGATORIO, SIN EXCEPCIÓN

Establecido el 20 de julio de 2026 tras una sesión donde se comprobó que
"el comando no dio error" **no es suficiente** — se puede copiar el
archivo equivocado, dejar una carpeta a medio actualizar, o reintroducir
un problema ya resuelto, todo sin que ningún comando "falle". A partir de
ahora, toda sesión de trabajo en este proyecto sigue esto sin excepción:

1. **Nunca declarar algo resuelto solo porque un comando no tiró error.**
   Verificar el **contenido real** después de cualquier copia/reemplazo:
   ```powershell
   Get-Content ruta\al\archivo.ts | Select-String -Pattern "algo-que-deberia-o-no-estar"
   ```
   o, para confirmar exactamente qué quedó guardado en git:
   ```powershell
   git --no-pager show HEAD:ruta\al\archivo.ts
   ```
2. **Antes de entregar cualquier archivo nuevo o modificado**, se prueba
   primero en el entorno de Claude: `npx eslint`, `npx tsc --noEmit`, y
   las pruebas automatizadas que correspondan — los tres, no solo uno.
3. **Después de que el archivo llega a la PC real**, se repite la misma
   verificación ahí — nunca asumir que "si funcionó en un lado, funciona
   en el otro".
4. **La pestaña "Problems" de VS Code no es la fuente de verdad** — se
   desactualiza. La fuente de verdad son los comandos de terminal. Pero
   si "Problems" muestra algo que el comando no explica, se investiga
   hasta encontrar la causa real (como se hizo el 20 de julio con los
   tipos de Jest) — nunca se descarta un aviso solo porque "ya pasó antes
   y no era nada".
5. **Cero tolerancia a dejar errores reales sin resolver.** Advertencias
   (warnings) menores y ya identificadas son aceptables temporalmente si
   están documentadas; errores, no.

---

## ✅ Fase 0 — Fundaciones de datos (COMPLETADA)
## ✅ Fase 1 — Fundaciones de código (COMPLETADA)
## ✅ Fase 2 — Núcleo de venta (MVP) — ciclo completo funcionando
## ✅ Núcleo blindado con pruebas automatizadas — COMPLETADO el 20 de julio

Los 4 módulos que faltaban ya están hechos, confirmados en la PC del
director, y subidos a GitHub:

| Archivo | Pruebas | Estado |
|---|---|---|
| `auth.e2e-spec.ts` | 11 | ✅ Confirmado en la PC |
| `busqueda.e2e-spec.ts` | 9 | ✅ Confirmado en la PC |
| `asientos.e2e-spec.ts` | 7 | ✅ Confirmado en la PC |
| `checkout.e2e-spec.ts` | 7 | ✅ Confirmado en la PC |
| `panel-admin-empresa.e2e-spec.ts` | 17 | ✅ Confirmado en la PC |

**Total: 52 de 52 pruebas automatizadas, corriendo todas juntas, sin
chocar entre sí, contra Postgres real.**

## 🔶 Fase 3 — Paneles de gestión — backend confirmado (manual + automatizado); falta el frontend

*(Sin cambios respecto a la Auditoría v1.1 en cuanto a alcance funcional
— lo que cambió hoy es que ahora también está protegido por pruebas
automatizadas, no solo verificación manual.)*

---

## Limpieza total de calidad de código — 20 de julio de 2026

Se encontró (a partir de que el director insistió correctamente en
revisar esto a fondo) que el código de la sesión anterior nunca había
pasado por un formateo completo del proyecto: **337 avisos** al revisar
`apps/api` entero con `eslint .` (antes solo se habían revisado archivos
sueltos, nunca el proyecto completo de una vez).

**Se corrigió de raíz, no archivo por archivo:**
- Se excluyó `dist/` (código compilado) del linter.
- Se corrió el formateador automático sobre todo el proyecto: 337 → 8.
- Se corrigieron a mano los 8 reales restantes (una importación sin usar,
  tres funciones `async` innecesarias, un parámetro sin usar requerido
  por una interfaz).
- Se encontró y corrigió la causa real de que el editor (no la terminal)
  mostrara "Cannot find name describe/it/expect" en todos los archivos
  de prueba: el `tsconfig.json` de `apps/api` no declaraba explícitamente
  `"types": ["jest", "node"]`. En un monorepo, el editor no siempre
  encuentra los tipos de paquetes hoisted al node_modules raíz de la
  misma forma que la terminal — declararlo explícito lo resuelve sin
  ambigüedad.
- Se corrigió también, por segunda vez (se había reintroducido sin
  querer al entregar un archivo), la eliminación de `"baseUrl": "./"`
  (opción obsoleta, sin `"paths"` asociado, sin ningún uso real en el
  proyecto).

**Estado final verificado — el mismo día, con las tres herramientas:**
- `npx eslint .` (todo `apps/api`): **0 errores**, 3 avisos menores
  identificados y aceptados (no bloquean nada, no son errores).
- `npx tsc --noEmit -p tsconfig.json`: **0 errores**.
- `npm run test:e2e` (las 52 pruebas): **52 passed, 52 total**.
- Confirmado con `git --no-pager show HEAD:archivo` que lo subido a
  GitHub coincide exactamente con lo verificado — no solo que el commit
  "no dio error".

---

## Hallazgos reales encontrados durante todo el proceso (sin cambios, siguen anotados)

- La respuesta de `/compras` no incluye el precio desglosado por boleto (solo `id` y `codigoQr`).
- No existe ninguna fila en `configuracion_plataforma` — el cargo de plataforma por pasajero cae en $0 por defecto.
- El buscador de ciudades no ordena por relevancia y corta en 10 resultados.
- Bloquear un número de asiento que no existe físicamente en el bus (ej. "ZZ99") hoy se acepta igual.

## 📍 Punto exacto de pausa — empezar aquí la próxima sesión

Con el núcleo completo (auth + búsqueda + asientos + checkout + paneles)
verificado dos veces (manual y automatizado) y con el código del
proyecto entero limpio de errores reales, el siguiente paso — según lo
ya acordado — es:

1. **Construir el frontend de Panel Empresa y Panel Admin** (el backend
   que lo soporta ya está confirmado funcionando).
2. En paralelo o después: aplicar el sistema de diseño visual final
   (estilo ClickBus, sección 7.1 del SRS v1.3) al frontend de pasajero
   existente y a los paneles nuevos.

---

## Decisiones de negocio pendientes (sin cambios, siguen abiertas)

- Comisión de plataforma (RN-003) — con evidencia concreta de que no hay ni siquiera una fila de configuración por defecto en la base de datos real.
- Ventana de bloqueo temporal de asiento (RN-004)
- Política de cancelación/reembolso (RN-005)
- Cuenta bancaria y periodicidad de liquidación del Terminal de Machala
- Nombre exacto del identificador operativo de unidad ("disco"/turno)
- Arquitectura de 3 comprobantes SRI por venta (validar con contador)
- Tarifas de planes comerciales de publicidad
- Credenciales reales de PayPhone/Kushki

## Fases futuras (sin cambios respecto al plan original)

- **Fase 3.5** — Diseño visual final del frontend (sistema ClickBus vía Tailwind), antes del piloto real.
- **Fase 4** — Piloto real con cooperativa del Terminal de Machala.
- **Fase 5** — RF-API (Modelo B), RF-COMM (publicidad), Kushki, reportes avanzados.
- **Fase 6** — Apps móviles (React Native).
- **Fase 7** — Escala nacional/internacional, expansión a Colombia.
- **Fase 8** — Producto separado de largo plazo (transporte tipo InDrive/Uber).

---

## Nota sobre la forma de trabajo

El director de este proyecto tiene experiencia técnica y prefiere
instrucciones directas, **un solo paso a la vez, con el comando exacto
para copiar y pegar**, sin explicaciones largas antes de actuar. Exige —
correctamente, como quedó demostrado el 20 de julio — que nada se declare
"normal" o "resuelto" sin evidencia real y verificada. Ver el protocolo
de verificación al inicio de este documento: es la forma de trabajo
esperada de aquí en adelante, no una excepción de un día difícil.
