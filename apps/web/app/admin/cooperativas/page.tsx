"use client";

import { useEffect, useState } from "react";
import {
  listarCooperativasAdmin,
  crearCooperativaAdmin,
  type CooperativaResumen,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";
import { CampoPassword } from "@/components/CampoPassword";

const ETIQUETA_ESTADO: Record<string, string> = {
  aprobada: "Aprobada",
  pendiente: "Pendiente",
  suspendida: "Suspendida",
};

const COLOR_ESTADO: Record<string, string> = {
  aprobada: "bg-emerald-100 text-emerald-700",
  pendiente: "bg-amber-100 text-amber-700",
  suspendida: "bg-red-100 text-red-700",
};

export default function CooperativasAdminPage() {
  const [cooperativas, setCooperativas] = useState<CooperativaResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [ruc, setRuc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [nombreComercial, setNombreComercial] = useState("");
  const [modeloIntegracion, setModeloIntegracion] = useState<"modelo_a" | "modelo_b">("modelo_a");
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoCorreo, setContactoCorreo] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");

  const [correoUsuario, setCorreoUsuario] = useState("");
  const [passwordUsuario, setPasswordUsuario] = useState("");
  const [nombreUsuario, setNombreUsuario] = useState("");

  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  function cargar() {
    const token = obtenerToken();
    if (!token) return;
    listarCooperativasAdmin(token)
      .then(setCooperativas)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las cooperativas."));
  }

  useEffect(cargar, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setErrorForm(null);
    const token = obtenerToken();
    if (!token || !ruc || !razonSocial || !nombreComercial || !correoUsuario || !passwordUsuario || !nombreUsuario) {
      setErrorForm("Completa los campos obligatorios: RUC, razón social, nombre comercial, y los datos del primer usuario.");
      return;
    }
    setGuardando(true);
    try {
      await crearCooperativaAdmin(
        token,
        {
          ruc: ruc.trim(),
          razonSocial: razonSocial.trim(),
          nombreComercial: nombreComercial.trim(),
          modeloIntegracion,
          contactoNombre: contactoNombre.trim() || undefined,
          contactoCorreo: contactoCorreo.trim() || undefined,
          contactoTelefono: contactoTelefono.trim() || undefined,
        },
        {
          correo: correoUsuario.trim(),
          password: passwordUsuario,
          nombreCompleto: nombreUsuario.trim(),
        },
      );
      setRuc("");
      setRazonSocial("");
      setNombreComercial("");
      setModeloIntegracion("modelo_a");
      setContactoNombre("");
      setContactoCorreo("");
      setContactoTelefono("");
      setCorreoUsuario("");
      setPasswordUsuario("");
      setNombreUsuario("");
      setMensajeExito(`Cooperativa "${nombreComercial}" creada correctamente.`);
      cargar();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo crear la cooperativa.";
      setErrorForm(mensaje);
      setMensajeError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />
      <Toast mensaje={mensajeError} onCerrar={() => setMensajeError(null)} tipo="error" />
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-dark">Cooperativas</h1>
        <p className="mt-1 text-sm text-brand-dark/60">
          Alta de una nueva cooperativa junto con su primer usuario administrador (RF-ADMIN-001).
        </p>
      </div>

      <form onSubmit={crear} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="font-display text-base font-bold text-brand-dark">Datos de la cooperativa</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              RUC
            </label>
            <input
              type="text"
              value={ruc}
              onChange={(e) => setRuc(e.target.value)}
              placeholder="0790123456001"
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              Razón social
            </label>
            <input
              type="text"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              placeholder="Cooperativa de Transportes X S.A."
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              Nombre comercial
            </label>
            <input
              type="text"
              value={nombreComercial}
              onChange={(e) => setNombreComercial(e.target.value)}
              placeholder="Transportes X"
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              Modelo de integración
            </label>
            <select
              value={modeloIntegracion}
              onChange={(e) => setModeloIntegracion(e.target.value as "modelo_a" | "modelo_b")}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            >
              <option value="modelo_a">Modelo A</option>
              <option value="modelo_b">Modelo B</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              Contacto — nombre (opcional)
            </label>
            <input
              type="text"
              value={contactoNombre}
              onChange={(e) => setContactoNombre(e.target.value)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              Contacto — correo (opcional)
            </label>
            <input
              type="email"
              value={contactoCorreo}
              onChange={(e) => setContactoCorreo(e.target.value)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
        </div>

        <h2 className="mt-6 font-display text-base font-bold text-brand-dark">Primer usuario administrador</h2>
        <p className="mt-1 text-xs text-brand-dark/50">
          Con estas credenciales la cooperativa entra por primera vez a su Panel Empresa.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              Nombre completo
            </label>
            <input
              type="text"
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              Correo
            </label>
            <input
              type="email"
              value={correoUsuario}
              onChange={(e) => setCorreoUsuario(e.target.value)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              Contraseña
            </label>
            <CampoPassword
              value={passwordUsuario}
              onChange={setPasswordUsuario}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
        </div>

        {errorForm && <p className="mt-4 text-sm font-medium text-red-600">{errorForm}</p>}

        <button
          type="submit"
          disabled={guardando}
          className="mt-6 h-[42px] rounded-lg bg-brand px-5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {guardando ? "Creando..." : "Crear cooperativa"}
        </button>
      </form>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-black/5 px-6 py-4">
          <h2 className="font-display text-base font-bold text-brand-dark">
            {cooperativas === null
              ? "Cargando..."
              : `${cooperativas.length} cooperativa${cooperativas.length === 1 ? "" : "s"}`}
          </h2>
        </div>

        {cooperativas !== null && cooperativas.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-brand-dark/50">
            Todavía no hay cooperativas — usa el formulario de arriba.
          </p>
        )}

        {cooperativas !== null && cooperativas.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              <tr>
                <th className="px-6 py-3">Nombre comercial</th>
                <th className="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {cooperativas.map((c) => (
                <tr key={c.id}>
                  <td className="px-6 py-3 font-medium text-brand-dark">{c.nombreComercial}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLOR_ESTADO[c.estado] ?? "bg-slate-100 text-slate-700"}`}
                    >
                      {ETIQUETA_ESTADO[c.estado] ?? c.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
