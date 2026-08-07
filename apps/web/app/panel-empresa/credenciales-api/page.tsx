"use client";

import { useEffect, useState } from "react";
import {
  listarCredencialesApi,
  crearCredencialApi,
  rotarCredencialApi,
  revocarCredencialApi,
  actualizarWebhookCredencialApi,
  type CredencialApiCooperativa,
  type CredencialApiRecienCreada,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Credenciales API — Modelo B (02-ago-2026). Autoservicio de la propia
 * cooperativa (RF-API-001, sección 3.11 del documento maestro): crear,
 * rotar, revocar, y configurar a dónde avisar cada venta (webhookUrl).
 * La llave completa solo se muestra una vez, justo al crear o rotar —
 * después de eso, ni este mismo panel puede volver a recuperarla.
 */
export default function CredencialesApiPage() {
  const [credenciales, setCredenciales] = useState<CredencialApiCooperativa[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const [webhookNuevo, setWebhookNuevo] = useState("");
  const [creando, setCreando] = useState(false);
  const [llaveRecienCreada, setLlaveRecienCreada] = useState<CredencialApiRecienCreada | null>(null);
  const [copiada, setCopiada] = useState(false);

  const [idEnAccion, setIdEnAccion] = useState<string | null>(null);
  const [idConfirmandoRevocar, setIdConfirmandoRevocar] = useState<string | null>(null);
  const [webhookEditando, setWebhookEditando] = useState<Record<string, string>>({});

  function cargar() {
    const token = obtenerToken();
    if (!token) return;
    listarCredencialesApi(token)
      .then(setCredenciales)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar."));
  }

  useEffect(() => {
    cargar();
  }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    const token = obtenerToken();
    if (!token) return;
    setCreando(true);
    setError(null);
    try {
      const resultado = await crearCredencialApi(token, webhookNuevo);
      setLlaveRecienCreada(resultado);
      setCopiada(false);
      setWebhookNuevo("");
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la credencial.");
    } finally {
      setCreando(false);
    }
  }

  async function rotar(id: string) {
    const token = obtenerToken();
    if (!token) return;
    setIdEnAccion(id);
    setError(null);
    try {
      const resultado = await rotarCredencialApi(token, id);
      setLlaveRecienCreada(resultado);
      setCopiada(false);
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo rotar la credencial.");
    } finally {
      setIdEnAccion(null);
    }
  }

  async function revocar(id: string) {
    const token = obtenerToken();
    if (!token) return;
    setIdEnAccion(id);
    setError(null);
    try {
      await revocarCredencialApi(token, id);
      setIdConfirmandoRevocar(null);
      setMensajeExito("Credencial revocada. Ya no acepta peticiones.");
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo revocar la credencial.");
    } finally {
      setIdEnAccion(null);
    }
  }

  async function guardarWebhook(id: string) {
    const token = obtenerToken();
    if (!token) return;
    const valor = webhookEditando[id] ?? "";
    setIdEnAccion(id);
    setError(null);
    try {
      await actualizarWebhookCredencialApi(token, id, valor);
      setMensajeExito("Webhook actualizado.");
      setWebhookEditando((w) => {
        const copia = { ...w };
        delete copia[id];
        return copia;
      });
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el webhook.");
    } finally {
      setIdEnAccion(null);
    }
  }

  async function copiarLlave() {
    if (!llaveRecienCreada) return;
    try {
      await navigator.clipboard.writeText(llaveRecienCreada.apiKeyCompleta);
      setCopiada(true);
    } catch {
      // Sin acceso al portapapeles (ej. contexto no seguro) -- la llave
      // sigue visible en pantalla para copiar a mano, no es un error fatal.
    }
  }

  const activas = credenciales?.filter((c) => c.activo) ?? [];
  const revocadas = credenciales?.filter((c) => !c.activo) ?? [];

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />

      <h1 className="font-display text-2xl font-bold text-brand-dark">Credenciales API</h1>
      <p className="mt-1 text-sm text-brand-dark/70">
        Conecta tu propio sistema de venta a Columbus. Genera una llave, configura a dónde avisamos
        cada venta, y revócala cuando quieras.
      </p>

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {llaveRecienCreada && (
        <div className="mt-6 rounded-2xl bg-amber-50 p-6 ring-2 ring-amber-300">
          <p className="font-display text-sm font-bold text-amber-900">
            Guarda esta llave ahora — no la vas a volver a ver
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Por seguridad, solo se muestra completa esta vez. Si la pierdes, tendrás que generar una
            nueva.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 ring-1 ring-amber-200">
            <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-brand-dark">
              {llaveRecienCreada.apiKeyCompleta}
            </code>
            <button
              type="button"
              onClick={copiarLlave}
              className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark"
            >
              {copiada ? "Copiada" : "Copiar"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setLlaveRecienCreada(null)}
            className="mt-3 text-xs font-semibold text-amber-800 underline"
          >
            Ya la guardé, ocultar
          </button>
        </div>
      )}

      <form
        onSubmit={crear}
        className="mt-6 space-y-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
      >
        <h2 className="font-display text-base font-bold text-brand-dark">Nueva credencial</h2>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            URL del webhook (opcional, puedes configurarla después)
          </label>
          <input
            type="url"
            value={webhookNuevo}
            onChange={(e) => setWebhookNuevo(e.target.value)}
            placeholder="https://tu-sistema.com/webhooks/ticketya"
            className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
          <p className="mt-1 text-xs text-brand-dark/50">
            Aquí te avisaremos cada vez que se venda un boleto de tu cooperativa.
          </p>
        </div>
        <button
          type="submit"
          disabled={creando}
          className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {creando ? "Generando..." : "Generar credencial"}
        </button>
      </form>

      {credenciales === null && !error && <p className="mt-6 text-sm text-brand-dark/50">Cargando...</p>}

      {credenciales !== null && credenciales.length === 0 && (
        <p className="mt-8 text-center text-sm text-brand-dark/50">
          Todavía no tienes ninguna credencial. Genera la primera arriba.
        </p>
      )}

      {activas.length > 0 && (
        <div className="mt-6 space-y-3">
          <h2 className="font-display text-sm font-bold text-brand-dark">Activas</h2>
          {activas.map((c) => (
            <div key={c.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              <div className="flex items-center justify-between">
                <code className="font-mono text-sm text-brand-dark">{c.apiKeyPrefix}...</code>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  Activa
                </span>
              </div>
              <p className="mt-1 text-xs text-brand-dark/40">Creada el {formatearFecha(c.creadoEn)}</p>

              <div className="mt-3">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                  Webhook
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={webhookEditando[c.id] ?? c.webhookUrl ?? ""}
                    onChange={(e) =>
                      setWebhookEditando((w) => ({ ...w, [c.id]: e.target.value }))
                    }
                    placeholder="https://tu-sistema.com/webhooks/ticketya"
                    className="flex-1 rounded-lg border border-brand-light px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
                  />
                  <button
                    type="button"
                    onClick={() => guardarWebhook(c.id)}
                    disabled={idEnAccion === c.id || webhookEditando[c.id] === undefined}
                    className="shrink-0 rounded-lg bg-brand-light px-3 py-2 text-xs font-semibold text-brand-dark transition hover:bg-brand-light/70 disabled:opacity-40"
                  >
                    Guardar
                  </button>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => rotar(c.id)}
                  disabled={idEnAccion === c.id}
                  className="rounded-lg bg-brand-light px-3 py-1.5 text-xs font-semibold text-brand-dark transition hover:bg-brand-light/70 disabled:opacity-40"
                >
                  {idEnAccion === c.id ? "Rotando..." : "Rotar"}
                </button>

                {idConfirmandoRevocar === c.id ? (
                  <>
                    <span className="self-center text-xs text-red-700">¿Seguro?</span>
                    <button
                      type="button"
                      onClick={() => revocar(c.id)}
                      disabled={idEnAccion === c.id}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-40"
                    >
                      Sí, revocar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIdConfirmandoRevocar(null)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-dark/70"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIdConfirmandoRevocar(c.id)}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                  >
                    Revocar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {revocadas.length > 0 && (
        <div className="mt-6 space-y-2">
          <h2 className="font-display text-sm font-bold text-brand-dark/50">Revocadas</h2>
          {revocadas.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl bg-brand-light/30 px-4 py-3"
            >
              <code className="font-mono text-sm text-brand-dark/50">{c.apiKeyPrefix}...</code>
              <span className="text-xs text-brand-dark/40">
                Revocada {c.revocadoEn ? `el ${formatearFecha(c.revocadoEn)}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
