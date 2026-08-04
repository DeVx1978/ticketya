# Modelo B — Guía técnica de conexión (Columbus / TicketYa)

**Última actualización:** 3 de agosto de 2026.
**Para quién es esta guía:** el equipo técnico de una cooperativa que tiene su propio sistema de venta y quiere conectarlo a Columbus, en vez de usar el panel web directamente.

---

## 1. Conceptos generales

Modelo B tiene 3 mecanismos, distintos y complementarios:

| Mecanismo | Dirección | Qué hace |
|---|---|---|
| **Webhook** | Columbus → tu sistema (push automático) | Te avisamos en tiempo real cada vez que se vende un boleto de tu cooperativa |
| **Recepción** | Tu sistema → Columbus (push tuyo) | Nos reportas cambios de precio en tus viajes |
| **Reconciliación** | Tu sistema → Columbus (consulta activa) | Consultas el estado de entrega de los webhooks que te enviamos, para verificar manualmente si algo se perdió |

Todo se autentica con tu **llave API**, no con usuario y contraseña.

---

## 2. Autenticación

Genera tu llave desde tu panel de cooperativa, en **Credenciales API** (`/panel-empresa/credenciales-api`). La llave completa se te muestra **una sola vez**, en el momento de crearla o de rotarla — guárdala de inmediato, nadie (ni nosotros) puede volver a mostrártela después.

Formato de la llave: `tkya_live_<prefijo>.<secreto>`

En cada petición a los endpoints de esta guía, mándala en el header:

```
Authorization: Bearer tkya_live_a1b2c3d4e5f6.7f3a8b9c0d1e2f3a4b5c6d7e8f9a0b1c
```

Si tu llave es inválida, fue revocada, o el header falta, recibes `401 Unauthorized`.

**Rotación:** si rotas tu llave (recomendado periódicamente, o si sospechas que se filtró), la anterior deja de funcionar en el mismo instante en que se genera la nueva — no hay ventana donde ambas sirvan.

---

## 3. Webhook — avisos de venta (Columbus → tu sistema)

Configura la URL de tu endpoint receptor en tu panel de credenciales. Cuando se confirme una venta de tu cooperativa (pago con tarjeta o pago manual aprobado), te enviamos:

```
POST <tu webhookUrl>
Content-Type: application/json

{
  "evento": "venta_creada",
  "compraId": "uuid",
  "boletos": [
    { "id": "uuid", "codigoQr": "...", "numeroAsiento": "12", "precioPagado": 8.50, ... }
  ]
}
```

**Responde `2xx`** para confirmar recepción. Si no respondes, o respondes con error, reintentamos automáticamente cada 5 minutos, hasta 5 intentos — después de eso, el evento se marca `fallido` y dejamos de reintentar solo (usa la reconciliación, sección 5, para detectarlo).

Una compra que mezcla boletos de varias cooperativas genera un webhook independiente por cada una, con solo los boletos que te corresponden.

---

## 4. Recepción — reportar cambio de precio

```
PATCH /api-externa/viajes/:id/precio
Authorization: Bearer <tu llave>
Content-Type: application/json

{ "precioBase": 9.00 }
```

`:id` es el id del viaje en Columbus (no el de tu sistema propio) — debe pertenecer a tu cooperativa. Respuesta `200 { "ok": true }` si se actualizó; `400` con un motivo si el viaje no existe o no es tuyo.

**Nota importante — alcance de esta primera entrega:** por ahora solo se puede reportar precio, no disponibilidad de asientos. El estado real de ocupación vive en nuestro sistema de reservas — abrir eso a escritura externa sin una estrategia de conflicto definida podría corromper reservas ya confirmadas. Esto se diseña cuando exista la primera integración real, con datos reales sobre cómo tu sistema representa disponibilidad.

---

## 5. Reconciliación — consultar estado de tus webhooks

```
GET /api-externa/webhooks?desde=2026-08-01&hasta=2026-08-03
Authorization: Bearer <tu llave>
```

Ambos parámetros (`desde`, `hasta`) son opcionales, formato de fecha ISO. Respuesta:

```json
[
  {
    "id": "uuid",
    "evento": "venta_creada",
    "estadoEntrega": "confirmado",
    "intentos": 1,
    "ultimoIntentoEn": "2026-08-03T14:22:10Z",
    "ultimaRespuesta": "HTTP 200",
    "creadoEn": "2026-08-03T14:22:05Z"
  }
]
```

`estadoEntrega` puede ser `pendiente`, `confirmado`, o `fallido`. Usa esto para detectar y reconciliar manualmente cualquier venta cuyo aviso no te haya llegado.

---

## 6. Lo que todavía no existe (hoja de ruta)

- Sincronización de disponibilidad de asientos en tiempo real (ver nota de la sección 4)
- Endpoint para reportar cambios de horario, no solo precio
- Ajustes de formato específicos para tu sistema particular — se resuelven caso por caso cuando conectes de verdad, no de forma genérica

Si tienes dudas o necesitas un ajuste específico para tu sistema, contacta al equipo de plataforma.
