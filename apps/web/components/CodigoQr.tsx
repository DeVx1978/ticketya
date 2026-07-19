"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

/**
 * Genera el QR directamente en el navegador del pasajero (librería
 * `qrcode`, sin depender de ningún servicio externo) — el código
 * codificado es literalmente `boletos.codigo_qr`, el mismo valor que el
 * vendedor escanea en el andén para validarlo (RF-COOP-006).
 */
export function CodigoQr({ valor }: { valor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, valor, { width: 200, margin: 1 });
    }
  }, [valor]);

  return <canvas ref={canvasRef} className="mx-auto" />;
}
