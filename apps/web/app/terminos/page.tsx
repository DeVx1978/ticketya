export const metadata = {
  title: "Términos de Servicio | Columbus",
};

/**
 * Términos de Servicio -- footer real (20-ago-2026). Contenido
 * redactado a partir de cómo la plataforma funciona de verdad, no un
 * texto genérico de plantilla: Columbus es el intermediario/mercado
 * que conecta cooperativas de transporte independientes con
 * pasajeros -- cada cooperativa es responsable de su propio servicio
 * de transporte, tal como confirma el resto de la plataforma
 * (perfiles de cooperativa independientes, sus propias políticas de
 * cancelación configurables, etc.).
 *
 * Este es un borrador razonable, no una revisión legal definitiva --
 * documentado como tal en el pie de la página.
 */
export default function TerminosPage() {
  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-brand-dark">Términos de Servicio</h1>
      <p className="mt-1 text-sm text-brand-dark/50">Última actualización: agosto de 2026</p>

      <div className="prose prose-sm mt-8 max-w-none text-brand-dark/80 [&>h2]:mt-8 [&>h2]:font-display [&>h2]:text-lg [&>h2]:font-bold [&>h2]:text-brand-dark [&>p]:mt-3 [&>p]:leading-relaxed [&>ul]:mt-3 [&>ul]:list-disc [&>ul]:pl-5">
        <h2>1. Qué es Columbus</h2>
        <p>
          Columbus es una plataforma que te permite buscar, comparar y comprar boletos de bus
          intermunicipal de distintas cooperativas de transporte. Columbus no opera los buses ni
          presta el servicio de transporte directamente -- cada viaje lo realiza la cooperativa de
          transporte correspondiente, que es la responsable de su propia flota, horarios, y
          cumplimiento de las normas de transporte terrestre vigentes en Ecuador.
        </p>

        <h2>2. Tu cuenta</h2>
        <p>
          Puedes comprar un boleto con o sin crear una cuenta. Si creas una cuenta, eres
          responsable de mantener segura tu contraseña y de la actividad que ocurra bajo tu
          usuario. Debes darnos información real y actualizada -- especialmente tu cédula o
          pasaporte, ya que es el dato con el que se valida tu identidad al abordar.
        </p>

        <h2>3. Compra de boletos</h2>
        <p>
          Al comprar un boleto, el precio final que ves antes de pagar incluye la tarifa del
          pasaje, la tasa de terminal (cuando aplica), el cargo de la plataforma, y el IVA según
          corresponda. Los descuentos legales (menor de edad, tercera edad, discapacidad) se
          calculan según lo que exige la normativa ecuatoriana vigente.
        </p>

        <h2>4. Cancelaciones y reprogramaciones</h2>
        <p>
          Cada cooperativa define su propia política de cancelación y reprogramación -- algunas
          la permiten con cierto límite de horas antes del viaje, otras no. Esa política se te
          muestra siempre antes de confirmar tu compra. Columbus no puede anular la política que
          la cooperativa haya definido para su propio servicio.
        </p>

        <h2>5. Tu responsabilidad como pasajero</h2>
        <ul>
          <li>Llegar a tiempo al punto de embarque con tu documento de identidad.</li>
          <li>Mostrar tu código QR o el código de tu boleto al personal de la cooperativa.</li>
          <li>Respetar las normas internas de cada unidad de transporte.</li>
        </ul>

        <h2>6. Cambios a estos Términos</h2>
        <p>
          Podemos actualizar estos Términos conforme la plataforma crece. Si el cambio es
          significativo, te lo haremos saber de forma visible en el sitio.
        </p>

        <h2>7. Contacto</h2>
        <p>
          Si tienes dudas sobre estos Términos, puedes escribirnos a través de los datos de
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
