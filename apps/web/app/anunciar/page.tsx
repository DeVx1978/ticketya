"use client";

import { useState } from "react";
import { enviarLeadPublicidad } from "@/lib/api";

/**
 * Formulario público de captación de leads -- Fase 3 de la sesión de
 * frontend (16-ago-2026). Conecta POST /publicidad/leads, ya
 * construido y probado desde el 30-jul-2026 (confirmado en la
 * auditoría con una prueba real que devolvió 201) -- el frontend
 * público nunca existió hasta ahora.
 */
export default function AnunciarPage() {
  const [nombreEmpresa, setNombreEmpresa] = useState("");
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoCorreo, setContactoCorreo] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await enviarLeadPublicidad({
        nombreEmpresa,
        contactoNombre: contactoNombre || undefined,
        contactoCorreo,
        contactoTelefono: contactoTelefono || undefined,
        mensaje: mensaje || undefined,
      });
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar tu solicitud.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <main className="mx-auto max-w-lg flex-1 px-4 py-20 text-center">
        <p className="font-display text-2xl font-bold text-brand-dark">¡Listo!</p>
        <p className="mt-2 text-sm text-brand-dark/70">
          Recibimos tu solicitud. Nuestro equipo comercial se pondrá en contacto contigo pronto.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg flex-1 px-4 py-16">
      <h1 className="font-display text-2xl font-bold text-brand-dark">Anuncia con Columbus</h1>
      <p className="mt-2 text-sm text-brand-dark/70">
        Miles de viajeros reales usan Columbus cada semana para comparar y comprar pasajes de bus en
        Ecuador. Cuéntanos de tu negocio y te contactamos con las opciones disponibles.
      </p>

      <form onSubmit={enviar} className="mt-8 space-y-4">
        <div>
          <label htmlFor="lead-empresa" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Nombre de tu empresa
          </label>
          <input
            id="lead-empresa"
            required
            minLength={2}
            value={nombreEmpresa}
            onChange={(e) => setNombreEmpresa(e.target.value)}
            className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-cobalto"
          />
        </div>
        <div>
          <label htmlFor="lead-nombre" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Tu nombre (opcional)
          </label>
          <input
            id="lead-nombre"
            value={contactoNombre}
            onChange={(e) => setContactoNombre(e.target.value)}
            className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-cobalto"
          />
        </div>
        <div>
          <label htmlFor="lead-correo" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Correo de contacto
          </label>
          <input
            id="lead-correo"
            type="email"
            required
            value={contactoCorreo}
            onChange={(e) => setContactoCorreo(e.target.value)}
            className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-cobalto"
          />
        </div>
        <div>
          <label htmlFor="lead-telefono" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Teléfono (opcional)
          </label>
          <input
            id="lead-telefono"
            value={contactoTelefono}
            onChange={(e) => setContactoTelefono(e.target.value)}
            className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-cobalto"
          />
        </div>
        <div>
          <label htmlFor="lead-mensaje" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Cuéntanos de tu negocio (opcional)
          </label>
          <textarea
            id="lead-mensaje"
            rows={3}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-cobalto"
          />
        </div>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-brand-dark px-6 py-3 text-base font-semibold text-white transition hover:bg-brand-dark/80 disabled:opacity-50"
        >
          {enviando ? "Enviando..." : "Enviar solicitud"}
        </button>
      </form>
    </main>
  );
}
