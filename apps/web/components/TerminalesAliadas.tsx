import { listarTerminalesAliadas } from "@/lib/api";
import { IconoTerminal } from "./ilustraciones";

/**
 * Terminales aliadas -- Fase 2 de la sesión de frontend (16-ago-2026).
 * Componente de servidor, mismo patrón real que RutasDisponibles.tsx.
 *
 * Machala destacada como la primera/estratégica -- instrucción
 * explícita del director (sesión de exploración de diseño,
 * DOCUMENTO_MAESTRO.md sección 5.8). No está hardcodeada: se busca
 * dentro de la lista REAL que devuelve el backend (por nombre o
 * ciudad, sin distinguir mayúsculas) y se ordena primero si existe --
 * si Machala todavía no está aliada en producción, esta sección
 * simplemente muestra el resto sin ninguna destacada, sin romperse.
 */
export async function TerminalesAliadas() {
  const terminales = await listarTerminalesAliadas();
  if (terminales.length === 0) return null;

  const ordenadas = [...terminales].sort((a, b) => {
    const aEsMachala = /machala/i.test(a.ciudad) || /machala/i.test(a.nombre);
    const bEsMachala = /machala/i.test(b.ciudad) || /machala/i.test(b.nombre);
    if (aEsMachala && !bEsMachala) return -1;
    if (bEsMachala && !aEsMachala) return 1;
    return 0;
  });

  return (
    <section className="bg-brand-dark px-4 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-screen-2xl">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-brand-amber">
          Terminales aliadas
        </h2>
        <div className="flex flex-wrap gap-2">
          {ordenadas.map((terminal) => {
            const destacada = /machala/i.test(terminal.ciudad) || /machala/i.test(terminal.nombre);
            return (
              <span
                key={terminal.id}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm ${
                  destacada
                    ? "bg-brand-amber font-semibold text-brand-dark"
                    : "bg-white/10 text-white/80"
                }`}
              >
                {destacada && <IconoTerminal tamano={20} className="shrink-0 rounded-full" />}
                {terminal.nombre}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
