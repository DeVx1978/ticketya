import {
  Inject,
  Injectable,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { CalificacionesRepositorio } from '../../dominio/calificaciones/calificaciones.ports';

export const CALIFICACIONES_REPOSITORIO = 'CALIFICACIONES_REPOSITORIO';

/**
 * Ítem 13, Fase 2 (05-ago-2026) -- descarga de boleto en PDF. Fecha
 * local Ecuador en ambos formateos, mismo criterio que el resto del
 * proyecto (America/Guayaquil, sin horario de verano).
 */
function formatearFechaBoleto(fechaSalida: string): string {
  return new Date(`${fechaSalida}T00:00:00`).toLocaleDateString('es-EC', {
    timeZone: 'America/Guayaquil',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatearHoraBoleto(hora: Date): string {
  return hora.toLocaleTimeString('es-EC', {
    timeZone: 'America/Guayaquil',
    hour: '2-digit',
    minute: '2-digit',
  });
}

@Injectable()
export class CalificacionesService {
  constructor(
    @Inject(CALIFICACIONES_REPOSITORIO)
    private readonly calificaciones: CalificacionesRepositorio,
  ) {}

  async calificarViaje(
    boletoId: string,
    usuarioId: string,
    puntuacion: number,
    comentario?: string,
  ) {
    if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) {
      throw new BadRequestException(
        'La puntuación debe ser un número entero entre 1 y 5.',
      );
    }

    const boleto =
      await this.calificaciones.obtenerCooperativaSiBoletoPerteneceA(
        boletoId,
        usuarioId,
      );
    if (!boleto) {
      throw new ForbiddenException(
        'Este boleto no existe o no te pertenece — solo puedes calificar un viaje que tú compraste.',
      );
    }

    // Hallazgo real, 22-jul-2026: no tiene sentido calificar un viaje
    // que todavía no ha ocurrido. Idealmente esto se abriría cuando el
    // sistema de monitoreo/alertas confirme la llegada real (fase
    // futura, no construida todavía) — mientras tanto, se usa la hora
    // de llegada ESTIMADA del viaje como el mejor proxy disponible.
    const referenciaLlegada =
      boleto.horaLlegadaEstimada ?? boleto.horaSalidaProgramada;
    if (new Date() < referenciaLlegada) {
      throw new BadRequestException(
        'Todavía no puedes calificar este viaje — espera a que llegues a tu destino.',
      );
    }

    const yaCalificado =
      await this.calificaciones.yaExisteCalificacionPara(boletoId);
    if (yaCalificado) {
      throw new ConflictException('Ya calificaste este boleto.');
    }

    return this.calificaciones.crear({
      boletoId,
      cooperativaId: boleto.cooperativaId,
      pasajeroUsuarioId: usuarioId,
      puntuacion,
      comentario,
    });
  }

  async resumenPorCooperativa(cooperativaId: string) {
    return this.calificaciones.resumenPorCooperativa(cooperativaId);
  }

  /**
   * Reseñas de texto reales (13-ago-2026). Mismo umbral mínimo de
   * confianza ya decidido en el ítem 12, Fase 2 (05-ago-2026,
   * DOCUMENTO_MAESTRO.md) para el promedio numérico -- 5 calificaciones
   * mínimo antes de mostrar nada, mismo criterio que Google/Amazon.
   * Se revisó el valor real en busqueda.service.ts (UMBRAL_MINIMO_CALIFICACIONES)
   * en vez de asumirlo -- debe mantenerse igual a ese si cambia ahí.
   */
  async listarResenas(cooperativaId: string, pagina: number, porPagina: number) {
    const UMBRAL_MINIMO_CALIFICACIONES = 5;
    const resumen = await this.calificaciones.resumenPorCooperativa(cooperativaId);
    if (resumen.cantidad < UMBRAL_MINIMO_CALIFICACIONES) {
      return { resenas: [], total: 0, pagina, porPagina };
    }
    const { resenas, total } = await this.calificaciones.listarResenasPorCooperativa(
      cooperativaId,
      pagina,
      porPagina,
    );
    return { resenas, total, pagina, porPagina };
  }

  async listarMisBoletos(usuarioId: string) {
    const boletos =
      await this.calificaciones.listarBoletosDePasajero(usuarioId);
    return boletos.map((b) => {
      const referenciaLlegada = b.horaLlegadaEstimada ?? b.horaSalidaProgramada;
      return {
        ...b,
        puedeCalificar: !b.yaCalificado && new Date() >= referenciaLlegada,
      };
    });
  }

  /**
   * Ítem 13, Fase 2 (05-ago-2026) -- descarga de boleto en PDF.
   * Requisitos del director: encabezado con marca, datos del viaje
   * organizados en secciones claras (no un bloque de texto corrido), y
   * QR grande y legible -- este documento representa a la plataforma
   * ante el pasajero, un vendedor real lo va a escanear en un andén.
   *
   * QR generado del lado del servidor con la misma librería `qrcode`
   * que ya usa el frontend (CodigoQr.tsx) -- ahí corre en el navegador
   * sobre un <canvas>, aquí no hay DOM disponible, así que se usa
   * QRCode.toBuffer() en vez de QRCode.toCanvas(). Mismo valor
   * codificado (codigo_qr) en ambos casos -- coherencia total con lo
   * que el vendedor ya escanea hoy para validar.
   */
  async generarPdfBoleto(boletoId: string, usuarioId: string): Promise<Buffer> {
    const datos = await this.calificaciones.obtenerDatosBoletoParaPdf(
      boletoId,
      usuarioId,
    );
    if (!datos) {
      throw new ForbiddenException(
        'Este boleto no existe o no te pertenece.',
      );
    }

    const qrBuffer = await QRCode.toBuffer(datos.codigoQr, {
      width: 300,
      margin: 1,
    });

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const anchoPagina = doc.page.width;
      const margenIzq = doc.page.margins.left;
      const margenDer = doc.page.margins.right;
      const anchoUtil = anchoPagina - margenIzq - margenDer;

      // Encabezado -- marca visible, requisito 1 del director.
      doc
        .fontSize(24)
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .text('Columbus', margenIzq, doc.y);
      doc
        .fontSize(10)
        .fillColor('#888888')
        .font('Helvetica')
        .text('Boleto electrónico', margenIzq, doc.y);
      doc.moveDown(1);
      doc
        .strokeColor('#dddddd')
        .lineWidth(1)
        .moveTo(margenIzq, doc.y)
        .lineTo(anchoPagina - margenDer, doc.y)
        .stroke();
      doc.moveDown(1.5);

      // Cooperativa + ruta -- requisito 2, cada dato en su propia sección.
      doc.fontSize(10).fillColor('#888888').text('OPERADO POR');
      doc
        .fontSize(16)
        .fillColor('#1a1a1a')
        .font('Helvetica-Bold')
        .text(datos.cooperativaNombre);
      doc.moveDown(1);

      doc
        .fontSize(20)
        .fillColor('#1a1a1a')
        .font('Helvetica-Bold')
        // 05-ago-2026 -- bug real encontrado con una prueba visual real:
        // la fuente estándar Helvetica de pdfkit no tiene el glifo de
        // flecha Unicode (→) -- lo sustituía por basura visual en vez
        // de fallar limpio. "->" (ASCII) es seguro en cualquier fuente.
        .text(`${datos.origenCiudad}  ->  ${datos.destinoCiudad}`);
      doc.moveDown(1.2);

      // Fecha/hora/asiento/pasajero -- cuadrícula de 2 columnas, cada
      // dato con su propia etiqueta, no un bloque de texto corrido.
      const col1X = margenIzq;
      const col2X = margenIzq + anchoUtil / 2;
      const inicioGrilla = doc.y;

      doc.fontSize(9).fillColor('#888888').font('Helvetica').text('FECHA', col1X, inicioGrilla);
      doc
        .fontSize(13)
        .fillColor('#1a1a1a')
        .font('Helvetica-Bold')
        .text(formatearFechaBoleto(datos.fechaSalida), col1X, inicioGrilla + 13, {
          width: anchoUtil / 2 - 10,
        });

      doc.fontSize(9).fillColor('#888888').font('Helvetica').text('HORA DE SALIDA', col2X, inicioGrilla);
      doc
        .fontSize(13)
        .fillColor('#1a1a1a')
        .font('Helvetica-Bold')
        .text(formatearHoraBoleto(datos.horaSalidaProgramada), col2X, inicioGrilla + 13);

      const segundaFila = inicioGrilla + 55;
      doc.fontSize(9).fillColor('#888888').font('Helvetica').text('ASIENTO', col1X, segundaFila);
      doc
        .fontSize(13)
        .fillColor('#1a1a1a')
        .font('Helvetica-Bold')
        .text(datos.numeroAsiento, col1X, segundaFila + 13);

      doc.fontSize(9).fillColor('#888888').font('Helvetica').text('PASAJERO', col2X, segundaFila);
      doc
        .fontSize(13)
        .fillColor('#1a1a1a')
        .font('Helvetica-Bold')
        .text(datos.pasajeroNombre, col2X, segundaFila + 13, { width: anchoUtil / 2 - 10 });

      doc.y = segundaFila + 55;
      doc.moveDown(1);
      doc
        .strokeColor('#dddddd')
        .lineWidth(1)
        .moveTo(margenIzq, doc.y)
        .lineTo(anchoPagina - margenDer, doc.y)
        .stroke();
      doc.moveDown(1.5);

      // QR grande y centrado -- requisito 3, nada de un ícono perdido
      // en la esquina, tiene que ser legible sin esfuerzo en un andén.
      doc
        .fontSize(11)
        .fillColor('#555555')
        .font('Helvetica')
        .text('Presenta este código al abordar', margenIzq, doc.y, {
          width: anchoUtil,
          align: 'center',
        });
      doc.moveDown(0.8);

      const tamanoQr = 220;
      const xQr = (anchoPagina - tamanoQr) / 2;
      doc.image(qrBuffer, xQr, doc.y, { width: tamanoQr, height: tamanoQr });
      doc.y += tamanoQr + 12;

      doc
        .fontSize(9)
        .fillColor('#888888')
        .font('Helvetica')
        .text(datos.codigoQr, margenIzq, doc.y, { width: anchoUtil, align: 'center' });

      doc.end();
    });
  }
}
