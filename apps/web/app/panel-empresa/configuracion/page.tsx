"use client";

import { useEffect, useState } from "react";
import {
  obtenerConfiguracionFiscal,
  actualizarConfiguracionFiscal,
  obtenerPoliticaCancelacionReprogramacion,
  actualizarPoliticaCancelacionReprogramacion,
  obtenerEstadoDatosCoop,
  confirmarDatosCoop,
  type ConfiguracionFiscal,
  type PoliticaCancelacionReprogramacion,
  type EstadoDatosCooperativa,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";
import { MetodosPago } from "./MetodosPago";

/**
 * Configuración de la cooperativa (29-jul-2026) — antes no existía
 * ninguna pantalla para esto, ni siquiera para lo fiscal que ya tenía
 * backend desde el 21-jul. Se construye ahora junto con la política de
 * cancelación/reprogramación (hallazgo real: Transportes Occidental,
 * Machala, no permite cambios ni devoluciones).
 */
export default function ConfiguracionPage() {
  const [fiscal, setFiscal] = useState<ConfiguracionFiscal | null>(null);
  const [politica, setPolitica] = useState<PoliticaCancelacionReprogramacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [guardandoFiscal, setGuardandoFiscal] = useState(false);
  const [guardandoPolitica, setGuardandoPolitica] = useState(false);

  // Ítem 10, Fase 2 (04-ago-2026) -- actualización periódica
  // obligatoria de datos legales.
  const [estadoDatos, setEstadoDatos] = useState<EstadoDatosCooperativa | null>(null);
  const [razonSocial, setRazonSocial] = useState("");
  const [ruc, setRuc] = useState("");
  const [direccionLegal, setDireccionLegal] = useState("");
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoCorreo, setContactoCorreo] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");
  const [guardandoDatos, setGuardandoDatos] = useState(false);

  useEffect(() => {
    const token = obtenerToken();
    if (!token) return;
    obtenerConfiguracionFiscal(token)
      .then(setFiscal)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar."));
    obtenerPoliticaCancelacionReprogramacion(token)
      .then(setPolitica)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar."));
    obtenerEstadoDatosCoop(token)
      .then((res) => {
        setEstadoDatos(res);
        setRazonSocial(res.datosActuales.razonSocial);
        setRuc(res.datosActuales.ruc);
        setDireccionLegal(res.datosActuales.direccionLegal ?? "");
        setContactoNombre(res.datosActuales.contactoNombre ?? "");
        setContactoCorreo(res.datosActuales.contactoCorreo ?? "");
        setContactoTelefono(res.datosActuales.contactoTelefono ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar."));
  }, []);

  async function guardarFiscal(e: React.FormEvent) {
    e.preventDefault();
    const token = obtenerToken();
    if (!token || !fiscal) return;
    setGuardandoFiscal(true);
    setError(null);
    try {
      await actualizarConfiguracionFiscal(token, fiscal);
      setMensajeExito("Configuración fiscal actualizada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardandoFiscal(false);
    }
  }

  /**
   * Ítem 10 (04-ago-2026) -- revisar y dejar igual también es una
   * confirmación válida, no hace falta cambiar nada para "aprobar".
   */
  async function confirmarDatos(e: React.FormEvent) {
    e.preventDefault();
    const token = obtenerToken();
    if (!token) return;
    setGuardandoDatos(true);
    setError(null);
    try {
      await confirmarDatosCoop(token, {
        razonSocial,
        ruc,
        direccionLegal,
        contactoNombre,
        contactoCorreo,
        contactoTelefono,
      });
      setEstadoDatos({ estado: "al_dia", datosActuales: { razonSocial, ruc, direccionLegal, contactoNombre, contactoCorreo, contactoTelefono } });
      setMensajeExito("Datos confirmados. Podrás confirmarlos de nuevo en 6 meses.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo confirmar.");
    } finally {
      setGuardandoDatos(false);
    }
  }

  async function guardarPolitica(e: React.FormEvent) {
    e.preventDefault();
    const token = obtenerToken();
    if (!token || !politica) return;
    setGuardandoPolitica(true);
    setError(null);
    try {
      await actualizarPoliticaCancelacionReprogramacion(token, politica);
      setMensajeExito("Política de cancelación/reprogramación actualizada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardandoPolitica(false);
    }
  }

  if (!fiscal || !politica) {
    return (
      <main className="mx-auto max-w-2xl flex-1 px-4 py-10">
        {error ? (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
            {error}
          </div>
        ) : (
          <p className="text-sm text-brand-dark/50">Cargando...</p>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />

      <h1 className="font-display text-2xl font-bold text-brand-dark">Configuración</h1>
      <p className="mt-1 text-sm text-brand-dark/60">
        Ajustes propios de tu cooperativa — cada empresa afiliada configura los suyos.
      </p>

      <MetodosPago onExito={setMensajeExito} onError={setError} />

      {/* Ítem 10, Fase 2 (04-ago-2026) -- actualización periódica obligatoria de datos legales */}
      {estadoDatos && (
        <form
          onSubmit={confirmarDatos}
          className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
        >
          <div>
            <h2 className="font-display text-base font-bold text-brand-dark">Datos legales</h2>
            <p className="mt-1 text-xs text-brand-dark/50">
              Revisa que estén correctos y confirma, aunque no cambies nada — se te pide cada 6
              meses.
            </p>
          </div>

          {estadoDatos.estado === "bloqueado" && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200">
              Llevan {estadoDatos.mesesSinConfirmar} meses sin confirmarse — crear horarios
              recurrentes y la carga masiva están bloqueados hasta que confirmes.
            </p>
          )}
          {estadoDatos.estado === "advertencia" && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
              Llevan {estadoDatos.mesesSinConfirmar} meses sin confirmarse.
            </p>
          )}
          {estadoDatos.estado === "al_dia" && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-emerald-200">
              Al día.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
                Razón social
              </label>
              <input
                type="text"
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
                RUC
              </label>
              <input
                type="text"
                value={ruc}
                onChange={(e) => setRuc(e.target.value)}
                className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
                Dirección legal
              </label>
              <input
                type="text"
                value={direccionLegal}
                onChange={(e) => setDireccionLegal(e.target.value)}
                className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
                Nombre de contacto
              </label>
              <input
                type="text"
                value={contactoNombre}
                onChange={(e) => setContactoNombre(e.target.value)}
                className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
                Correo de contacto
              </label>
              <input
                type="email"
                value={contactoCorreo}
                onChange={(e) => setContactoCorreo(e.target.value)}
                className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
                Teléfono de contacto
              </label>
              <input
                type="text"
                value={contactoTelefono}
                onChange={(e) => setContactoTelefono(e.target.value)}
                className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={guardandoDatos}
            className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {guardandoDatos ? "Confirmando..." : "Confirmar datos"}
          </button>
        </form>
      )}

      {/* Política de cancelación/reprogramación */}
      <form
        onSubmit={guardarPolitica}
        className="mt-6 space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
      >
        <div>
          <h2 className="font-display text-base font-bold text-brand-dark">
            Cancelación y reprogramación
          </h2>
          <p className="mt-1 text-xs text-brand-dark/50">
            Configúralas por separado — cancelar es una venta perdida para ti, reprogramar no,
            así que no tienen que ir juntas.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-brand-light/30 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-brand-dark">Permitir cancelaciones</p>
            {!politica.permiteCancelacion && (
              <p className="text-xs text-amber-700">
                Si no viaja, el pasajero pierde el boleto completo.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              setPolitica((p) => (p ? { ...p, permiteCancelacion: !p.permiteCancelacion } : p))
            }
            className={`relative h-6 w-11 rounded-full transition ${
              politica.permiteCancelacion ? "bg-brand" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                politica.permiteCancelacion ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>
        {politica.permiteCancelacion && (
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              Horas mínimas antes de la salida para poder cancelar
            </label>
            <input
              type="number"
              min={0}
              max={720}
              value={politica.horasLimiteCancelacion ?? ""}
              placeholder="2 (valor de reserva si lo dejas vacío)"
              onChange={(e) =>
                setPolitica((p) =>
                  p
                    ? {
                        ...p,
                        horasLimiteCancelacion: e.target.value ? Number(e.target.value) : null,
                      }
                    : p,
                )
              }
              className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl bg-brand-light/30 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-brand-dark">Permitir reprogramaciones</p>
            {!politica.permiteReprogramacion && (
              <p className="text-xs text-amber-700">
                El pasajero no podrá cambiar de fecha, ni con crédito ni pagando la diferencia.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() =>
              setPolitica((p) =>
                p ? { ...p, permiteReprogramacion: !p.permiteReprogramacion } : p,
              )
            }
            className={`relative h-6 w-11 rounded-full transition ${
              politica.permiteReprogramacion ? "bg-brand" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                politica.permiteReprogramacion ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>
        {politica.permiteReprogramacion && (
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              Horas mínimas antes de la salida para poder reprogramar
            </label>
            <input
              type="number"
              min={0}
              max={720}
              value={politica.horasLimiteReprogramacion ?? ""}
              placeholder="2 (valor de reserva si lo dejas vacío)"
              onChange={(e) =>
                setPolitica((p) =>
                  p
                    ? {
                        ...p,
                        horasLimiteReprogramacion: e.target.value ? Number(e.target.value) : null,
                      }
                    : p,
                )
              }
              className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
        )}

        {!politica.permiteCancelacion || !politica.permiteReprogramacion ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
            El pasajero verá una alerta clara sobre esto antes de pagar, en la pantalla de elegir
            asiento y en la confirmación de compra.
          </p>
        ) : null}

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={guardandoPolitica}
          className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {guardandoPolitica ? "Guardando..." : "Guardar política"}
        </button>
      </form>

      {/* Configuración fiscal (IVA) */}
      <form
        onSubmit={guardarFiscal}
        className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
      >
        <h2 className="font-display text-base font-bold text-brand-dark">IVA</h2>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
            Porcentaje de IVA
          </label>
          <input
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={fiscal.ivaPorcentaje}
            onChange={(e) => setFiscal((f) => (f ? { ...f, ivaPorcentaje: Number(e.target.value) } : f))}
            className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-brand-dark">
          <input
            type="checkbox"
            checked={fiscal.ivaVisibleEnBoleto}
            onChange={(e) => setFiscal((f) => (f ? { ...f, ivaVisibleEnBoleto: e.target.checked } : f))}
          />
          Mostrar el desglose de IVA en el boleto
        </label>
        <label className="flex items-center gap-2 text-sm text-brand-dark">
          <input
            type="checkbox"
            checked={fiscal.ivaSigueTasaNacional}
            onChange={(e) =>
              setFiscal((f) => (f ? { ...f, ivaSigueTasaNacional: e.target.checked } : f))
            }
          />
          Seguir automáticamente la tasa nacional de IVA
        </label>
        <button
          type="submit"
          disabled={guardandoFiscal}
          className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {guardandoFiscal ? "Guardando..." : "Guardar IVA"}
        </button>
      </form>
    </main>
  );
}
