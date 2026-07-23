# TicketYa — Estado y Ruta del Proyecto

**Última actualización:** 23 de julio de 2026
**Repositorio:** https://github.com/DeVx1978/ticketya (privado)
**Última rama/commit verificado:** `main` @ `f46378b`

---

## 1. Qué es TicketYa

SaaS de venta de pasajes de bus interprovincial para Ecuador, con visión de escalar a nivel nacional y, después, a otros países. Modelo multi-tenant real: múltiples cooperativas de transporte operan sobre la misma plataforma, con aislamiento de datos garantizado por Row-Level Security de PostgreSQL, no solo por lógica de aplicación.

---

## 2. Estado por fase

| Fase | Estado |
|---|---|
| Fase 0 — Base de datos (41 tablas, RLS) | ✅ Completa |
| Fase 1 — Fundaciones de código (NestJS + Next.js) | ✅ Completa |
| Fase 2 — Núcleo de venta (MVP) | ✅ Completa |
| Fase 3 — Panel Empresa | ✅ Completa |
| Fase 3 — Panel Admin | ✅ Completa |
| Fase 3.5 — Diseño visual final | ⏳ No iniciada, a propósito (ver sección 6) |
| Fase 4 — Piloto real en Machala | ⏳ Pendiente |
| Fase 5 — Pagos reales, publicidad, notificaciones | ⏳ Pendiente |

**Pruebas automatizadas: 85, todas pasando**, verificadas en la máquina real del usuario (Windows), no solo en el entorno de desarrollo.

---

## 3. Todo lo cerrado en la sesión del 22-23 de julio de 2026

Fue una sesión extensa de un solo día, con ~30 entregas verificadas de punta a punta (backend + frontend + pruebas + confirmación en vivo). Resumen por categoría:

### Configuración de negocio (antes fija, ahora configurable)
- **IVA por cooperativa** — 15% incluido en el precio por defecto, configurable, ocultable.
- **IVA nacional propagable** — el admin de plataforma lo cambia una vez y se propaga a todas las cooperativas en modo automático (las que fijaron su propio valor manualmente no se tocan).
- **Cargo fijo de plataforma por pasajero** — antes caía en $0 sin forma de cambiarlo; ahora configurable desde Panel Admin.
- **Tasa de terminal** — editable en línea (antes solo se podía fijar al crear el punto de operación).
- **Ventana de cancelación** — configurable (por defecto 2 horas antes de la salida).

### Panel Admin (completo, las 4 pantallas)
Dashboard nacional (ventas agregadas por cooperativa), Cooperativas (crear + listar), Puntos de Operación (crear + listar + editar tasa), Banners propios (promoción interna, no venta a terceros).

### Confiabilidad y seguridad
- **Creación de cooperativa + primer usuario** ahora es atómica (todo o nada) — antes un correo duplicado podía dejar una cooperativa huérfana sin ningún usuario administrador.
- **Sesión expirada** manejada correctamente en checkout/asientos/calificar (antes mostraba "Unauthorized" crudo).
- **Mensajes de error traducidos** — antes cualquier fallo de base de datos llegaba como "Internal server error" genérico.

### Experiencia de usuario
- Notificaciones de éxito (verde) y error (rojo) en todos los formularios de creación.
- Mostrar/ocultar contraseña.
- Header público con acceso a Iniciar sesión / Registrarse / Mi perfil / Mis boletos.
- Logo de cooperativa (visible en resultados de búsqueda).
- Perfil de usuario con foto, "miembro desde", viajes completados, edición de datos.
- Cambio de contraseña (logueado) — antes no existía ninguna forma de hacerlo.

### Funcionalidad crítica que faltaba por completo
- **Autorizaciones de menores de edad** — validación real al comprar (adulto acompañante o autorización con responsable), verificación de documentos en el andén.
- **Cancelación de boletos** (por el pasajero) — antes no existía ninguna forma.
- **Cancelación de un viaje completo** (por la cooperativa) — cascada automática a todos los boletos vendidos.
- **Cambio de unidad en un viaje programado** ("vehículo de reemplazo") — para cuando el bus se daña, sin tocar los boletos ya vendidos. Validado contra capacidad para no invalidar asientos ya vendidos. Investigado con base real: patrón estándar del sector (FlixBus) + respaldo legal ecuatoriano (la ANT sanciona la interrupción del servicio como infracción administrativa muy grave, LOTTTSV).
- **Recuperación del código QR** desde "Mis boletos" — antes, si cerrabas la pantalla de confirmación de compra sin captura, perdías el boleto para siempre.
- **Lista de pasajeros por viaje ("manifiesto")** — antes la cooperativa no tenía forma de ver quién iba a abordar un viaje específico.
- **Pantalla "Personal"** en Panel Empresa — crear y ver vendedores y conductores (antes el backend lo permitía, pero no existía ninguna pantalla).
- **Sistema de calificaciones de viaje** — 1-5 estrellas + comentario, promedio visible en la búsqueda. Corregido a tiempo: originalmente se podía calificar justo al comprar (antes de viajar); ahora solo se habilita después de la hora estimada de llegada.

### Calidad técnica
- Buscador de ciudades ordenado por relevancia (antes sin ningún criterio).
- Validación de número de asiento contra la capacidad real del vehículo (antes se podía bloquear un asiento inexistente).
- Desglose de precio por boleto en la respuesta y pantalla de compra (tarifa, tasa de terminal, IVA, total).
- **Limpieza real de datos de prueba** — las pruebas automatizadas ahora borran de verdad lo que crean (antes decían hacerlo en un comentario, pero no era cierto; llegamos a acumular ~250 registros de prueba en la base de datos real, incluyendo una confusión real de terminales duplicados que hubo que limpiar a mano).

---

## 4. Pendientes explícitos, con la razón de por qué no se hicieron hoy

| Pendiente | Por qué se dejó pendiente |
|---|---|
| **Recuperación de contraseña por correo** | Requiere un servicio de envío de correo real (Resend), no conectado todavía — construir la mitad sin la otra mitad sería inseguro. |
| **Reparto de pago (cooperativa / plataforma / terminal)** | Decisión de negocio + verificación técnica pendiente: confirmar con Kushki si su función de "Comisiones a terceros" soporta repartir entre 3 destinatarios en una sola transacción, o si la parte del terminal necesita resolverse aparte (liquidación periódica). Principio ya acordado: TicketYa nunca debe tener control ni custodia del dinero que no le corresponde. |
| **Notificaciones automáticas (correo / WhatsApp)** | Diseñado en el esquema (tabla `notificaciones`), no conectado — Fase 5. |
| **Reprogramación completa de un viaje con crédito/voucher** | Distinto de "cambiar unidad" (que sí se construyó) — este es para cuando el viaje en sí no puede pasar (clima, ruta suspendida), y necesita un sistema de crédito que no existe todavía (los pagos son simulados). |
| **Diseño visual final** | Deliberado — se construye después de tener la funcionalidad sólida, no antes, para no rediseñar dos veces. |
| **Reparto en 3 partes (split de pago)** | Ver arriba, ligado al mismo tema de Kushki. |

---

## 5. Decisiones de negocio que el usuario todavía tiene que tomar

- % de comisión de la plataforma (necesario para que la liquidación tenga sentido completo).
- Modelo final de reparto de pago (split directo vía Kushki vs. liquidación periódica).
- Tasa real del terminal de Machala, para el piloto.
- Política exacta de reembolso al cancelar (hoy no hay reembolso monetario real porque los pagos son simulados).

---

## 6. Hallazgos menores, todavía sin cerrar

- El nombre "Bus estándar 2+2 RED" y similares (símbolos de codificación raros) pueden aparecer si se crean datos desde PowerShell sin especificar `-Encoding UTF8`.
- No hay forma de editar hora/precio de un viaje ya creado (solo se puede cambiar la unidad o cancelarlo completo).

---

## 7. Cuentas de prueba (en la máquina del usuario)

| Rol | Correo | Contraseña |
|---|---|---|
| Admin de plataforma | `director.demo@ticketya.ec` | `Demo12345` |
| Admin de cooperativa | `coop.demo@ticketya.ec` | `Demo12345` |

---

## 8. Protocolo de verificación (obligatorio en toda la sesión)

1. Nunca declarar algo resuelto sin comprobarlo con comandos reales (`npm run test:e2e`, `npx next build`).
2. Cada entrega de código se empaqueta en un `.zip`, se instala en la máquina real del usuario, se corren las pruebas ahí — no basta con que pase en el entorno de desarrollo.
3. Toda migración de base de datos se aplica manualmente en pgAdmin, con el SQL exacto entregado paso a paso.
4. Después de cada migración de esquema, reconstruir el paquete `@ticketya/db` (`npx tsc -p tsconfig.build.json` dentro de `packages/db`) — si no, el backend no reconoce las columnas nuevas.
5. PowerShell: usar `-Encoding UTF8` para texto con tildes/ñ.
6. Cada archivo de prueba que cree su propia cooperativa/datos debe limpiarlos en un `afterAll` real (ver `apps/api/test/helpers/limpieza.ts`) — no basta con decirlo en un comentario.

---

## 9. Cómo levantar el proyecto localmente

```powershell
# Terminal 1 — backend
cd C:\Users\exitoso\Desktop\ticketya\apps\api
npm run start:dev

# Terminal 2 — frontend
cd C:\Users\exitoso\Desktop\ticketya\apps\web
npm run dev
```

Frontend normalmente en `http://localhost:3001` (el 3000 lo ocupa el backend).

---

## 10. Próximo paso recomendado

Con la funcionalidad crítica ya cerrada, las opciones reales para la siguiente sesión son:
1. Definir el reparto de pago con Kushki (conversación de negocio, no de código).
2. Empezar el diseño visual final (Fase 3.5).
3. Seguir cerrando hallazgos menores según se encuentren en pruebas reales.
