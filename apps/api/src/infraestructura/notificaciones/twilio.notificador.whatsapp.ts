import { Injectable, Logger } from '@nestjs/common';
import twilio from 'twilio';
import type { NotificadorWhatsApp } from '../../dominio/auth/auth.ports';

/**
 * Notificador de WhatsApp real, vía Twilio (14-ago-2026). Reemplaza a
 * SimuladorNotificadorWhatsApp cuando las credenciales reales están
 * configuradas -- ver notificaciones-programadas.module.ts, que elige
 * cuál de las 2 implementaciones inyectar según TWILIO_ACCOUNT_SID
 * esté presente o no.
 *
 * Usa una API Key (no el Auth Token maestro) -- práctica más segura:
 * revocable por separado, sin exponer el token raíz de la cuenta.
 *
 * Mientras la cuenta siga en el Sandbox de WhatsApp (antes de tener
 * el número de negocio verificado, que requiere la empresa
 * constituida -- ver DOCUMENTO_MAESTRO.md), Twilio exige 2 cosas
 * reales que no dependen de este código:
 * 1. El número de origen debe ser el número compartido del sandbox
 *    (normalmente +14155238886, pero configurable por si cambia).
 * 2. El destinatario debe haberse "unido" al sandbox antes (mandando
 *    el código "join palabra-palabra" desde su propio WhatsApp) --
 *    si no se unió, Twilio devuelve el error 63015, no es un bug de
 *    este código.
 */
@Injectable()
export class TwilioNotificadorWhatsApp implements NotificadorWhatsApp {
  private readonly logger = new Logger(TwilioNotificadorWhatsApp.name);
  private readonly cliente: twilio.Twilio;
  private readonly numeroOrigen: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const apiKeySid = process.env.TWILIO_API_KEY_SID!;
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET!;
    this.numeroOrigen = process.env.TWILIO_WHATSAPP_NUMERO ?? '+14155238886';

    this.cliente = twilio(apiKeySid, apiKeySecret, { accountSid });
  }

  private async enviar(telefono: string, texto: string): Promise<void> {
    try {
      const mensaje = await this.cliente.messages.create({
        from: `whatsapp:${this.numeroOrigen}`,
        to: `whatsapp:${telefono}`,
        body: texto,
      });
      this.logger.log(`[WHATSAPP REAL] Enviado a ${telefono}, sid=${mensaje.sid}, estado=${mensaje.status}`);
    } catch (error) {
      // Mismo criterio "nunca lanza" que ya usa WalletService y el
      // despachador de webhooks -- una notificacion que falla no debe
      // tumbar el flujo principal (la compra, la validacion del QR,
      // etc.) que la disparo.
      this.logger.error(
        `[WHATSAPP REAL] Fallo al enviar a ${telefono}: ${error instanceof Error ? error.message : 'error desconocido'}`,
      );
    }
  }

  async enviarRecordatorioViaje(
    telefono: string,
    detalle: {
      viajeId: string;
      origenCiudad: string;
      destinoCiudad: string;
      fechaSalida: string;
      horaSalidaProgramada: string;
    },
  ): Promise<void> {
    await this.enviar(
      telefono,
      `Recordatorio Columbus: tu viaje ${detalle.origenCiudad} -> ${detalle.destinoCiudad} sale el ${detalle.fechaSalida} a las ${detalle.horaSalidaProgramada}. ¡Buen viaje!`,
    );
  }

  async enviarAvisoCambioOperativo(
    telefono: string,
    detalle: { viajeId: string; motivo: string },
  ): Promise<void> {
    await this.enviar(
      telefono,
      `Aviso Columbus sobre tu viaje: ${detalle.motivo}`,
    );
  }

  async enviarAvisoLlegada(
    telefono: string,
    detalle: { viajeId: string; destinoCiudad: string },
  ): Promise<void> {
    await this.enviar(
      telefono,
      `Columbus: tu bus está llegando a ${detalle.destinoCiudad}. No olvides tus pertenencias.`,
    );
  }

  async enviarSolicitudCalificacion(
    telefono: string,
    detalle: { viajeId: string; destinoCiudad: string },
  ): Promise<void> {
    await this.enviar(
      telefono,
      `Columbus: ¿cómo estuvo tu viaje a ${detalle.destinoCiudad}? Califícalo en la app.`,
    );
  }
}
