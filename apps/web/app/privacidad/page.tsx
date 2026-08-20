export const metadata = {
  title: "Política de Privacidad | Columbus",
};

/**
 * Política de Privacidad -- footer real (20-ago-2026). Describe los
 * datos que la plataforma realmente recolecta, confirmado contra el
 * código real (cedula/documento para validar identidad, telefono
 * para WhatsApp -- aunque hoy simulado, correo, datos de pago que
 * pasan por pasarelas externas, no se guardan en la plataforma).
 */
export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-brand-dark">Política de Privacidad</h1>
      <p className="mt-1 text-sm text-brand-dark/50">Última actualización: agosto de 2026</p>

      <div className="prose prose-sm mt-8 max-w-none text-brand-dark/80 [&>h2]:mt-8 [&>h2]:font-display [&>h2]:text-lg [&>h2]:font-bold [&>h2]:text-brand-dark [&>p]:mt-3 [&>p]:leading-relaxed [&>ul]:mt-3 [&>ul]:list-disc [&>ul]:pl-5">
        <h2>1. Qué datos recolectamos</h2>
        <p>Para poder venderte un boleto real y que puedas abordar, necesitamos:</p>
        <ul>
          <li>Tu nombre completo y número de cédula o pasaporte -- para identificarte al abordar.</li>
          <li>Tu correo y/o teléfono -- para enviarte la confirmación de tu compra.</li>
          <li>
            Los datos de tu pago -- estos los procesa directamente la pasarela de pago (tarjeta,
            De Una, PayPhone, transferencia); Columbus no almacena tu número de tarjeta.
          </li>
        </ul>

        <h2>2. Para qué usamos tus datos</h2>
        <ul>
          <li>Generar tu boleto con código QR y validarte al abordar.</li>
          <li>Enviarte la confirmación de compra y avisos sobre tu viaje.</li>
          <li>Calcular descuentos legales cuando aplican (menor de edad, tercera edad, discapacidad).</li>
          <li>Prevenir fraude y mantener segura tu cuenta.</li>
        </ul>

        <h2>3. Con quién compartimos tus datos</h2>
        <p>
          Compartimos los datos estrictamente necesarios de tu viaje (nombre, documento, asiento)
          con la cooperativa de transporte que opera tu boleto -- es quien necesita validar tu
          identidad al abordar. No vendemos tus datos a terceros con fines de publicidad.
        </p>

        <h2>4. Cuánto tiempo guardamos tus datos</h2>
        <p>
          Guardamos el historial de tus compras mientras tengas una cuenta activa. Si eliminas tu
          cuenta, anonimizamos tus datos personales -- los boletos ya emitidos conservan la
          información del pasajero que viajó, por requisito de auditoría del transporte.
        </p>

        <h2>5. Tus derechos</h2>
        <p>
          Puedes pedirnos ver, corregir, o eliminar tu cuenta y tus datos personales en cualquier
          momento desde tu perfil, o escribiéndonos directamente.
        </p>

        <h2>6. Contacto</h2>
        <p>
          Para cualquier duda sobre tus datos, puedes escribirnos a través de los datos de
          contacto que aparecen en el pie de página de este sitio.
        </p>
      </div>

      <p className="mt-10 rounded-lg bg-brand-light/40 px-4 py-3 text-xs text-brand-dark/50">
        Este documento es un borrador redactado de buena fe según cómo opera la plataforma hoy.
        No sustituye una revisión legal formal.
      </p>
    </main>
  );
}
