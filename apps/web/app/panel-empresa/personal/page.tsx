"use client";

import { useEffect, useState } from "react";
import {
  crearUsuarioStaffCoop,
  listarUsuariosStaffCoop,
  crearConductorCoop,
  listarConductoresCoop,
  type UsuarioStaffResumen,
  type ConductorResumen,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";
import { CampoPassword } from "@/components/CampoPassword";

const ETIQUETA_ROL: Record<string, string> = {
  vendedor: "Vendedor",
  admin_cooperativa: "Administrador",
};

export default function PersonalPage() {
  const [staff, setStaff] = useState<UsuarioStaffResumen[] | null>(null);
  const [conductores, setConductores] = useState<ConductorResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Formulario: personal (staff)
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [nombreStaff, setNombreStaff] = useState("");
  const [rol, setRol] = useState<"vendedor" | "admin_cooperativa">("vendedor");
  const [guardandoStaff, setGuardandoStaff] = useState(false);
  const [errorStaff, setErrorStaff] = useState<string | null>(null);

  // Formulario: conductor
  const [nombreConductor, setNombreConductor] = useState("");
  const [cedula, setCedula] = useState("");
  const [licenciaNumero, setLicenciaNumero] = useState("");
  const [licenciaCategoria, setLicenciaCategoria] = useState("");
  const [telefonoConductor, setTelefonoConductor] = useState("");
  const [guardandoConductor, setGuardandoConductor] = useState(false);
  const [errorConductor, setErrorConductor] = useState<string | null>(null);

  function cargarTodo() {
    const token = obtenerToken();
    if (!token) return;
    Promise.all([listarUsuariosStaffCoop(token), listarConductoresCoop(token)])
      .then(([s, c]) => {
        setStaff(s);
        setConductores(c);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la información."));
  }

  useEffect(cargarTodo, []);

  async function crearStaff(e: React.FormEvent) {
    e.preventDefault();
    setErrorStaff(null);
    const token = obtenerToken();
    if (!token || !correo.trim() || !password || !nombreStaff.trim()) {
      setErrorStaff("Completa correo, contraseña y nombre.");
      return;
    }
    setGuardandoStaff(true);
    try {
      await crearUsuarioStaffCoop(token, {
        correo: correo.trim(),
        password,
        nombreCompleto: nombreStaff.trim(),
        rol,
      });
      setMensajeExito(`Usuario "${nombreStaff.trim()}" creado correctamente.`);
      setCorreo("");
      setPassword("");
      setNombreStaff("");
      setRol("vendedor");
      cargarTodo();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo crear el usuario.";
      setErrorStaff(mensaje);
      setMensajeError(mensaje);
    } finally {
      setGuardandoStaff(false);
    }
  }

  async function crearConductor(e: React.FormEvent) {
    e.preventDefault();
    setErrorConductor(null);
    const token = obtenerToken();
    if (!token || !nombreConductor.trim() || !cedula.trim()) {
      setErrorConductor("Completa al menos el nombre y la cédula.");
      return;
    }
    setGuardandoConductor(true);
    try {
      await crearConductorCoop(token, {
        nombreCompleto: nombreConductor.trim(),
        cedula: cedula.trim(),
        licenciaNumero: licenciaNumero.trim() || undefined,
        licenciaCategoria: licenciaCategoria.trim() || undefined,
        telefono: telefonoConductor.trim() || undefined,
      });
      setMensajeExito(`Conductor "${nombreConductor.trim()}" registrado correctamente.`);
      setNombreConductor("");
      setCedula("");
      setLicenciaNumero("");
      setLicenciaCategoria("");
      setTelefonoConductor("");
      cargarTodo();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo crear el conductor.";
      setErrorConductor(mensaje);
      setMensajeError(mensaje);
    } finally {
      setGuardandoConductor(false);
    }
  }

  return (
    <div className="space-y-8">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />
      <Toast mensaje={mensajeError} onCerrar={() => setMensajeError(null)} tipo="error" />
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-dark">Personal</h1>
        <p className="mt-1 text-sm text-brand-dark/70">
          Da de alta a tus vendedores (para que puedan validar boletos en el andén) y a tus conductores.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      {/* ─── Usuarios (staff) ─── */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-brand-dark">Usuarios del sistema</h2>

        <form
          onSubmit={crearStaff}
          className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
        >
          <div>
            <label htmlFor="personal-staff-nombre" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Nombre completo
            </label>
            <input
              id="personal-staff-nombre"
              type="text"
              value={nombreStaff}
              onChange={(e) => setNombreStaff(e.target.value)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label htmlFor="personal-staff-correo" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Correo
            </label>
            <input
              id="personal-staff-correo"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label htmlFor="personal-staff-password" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Contraseña
            </label>
            <CampoPassword id="personal-staff-password" value={password} onChange={setPassword} placeholder="Mínimo 8 caracteres" />
          </div>
          <div>
            <label htmlFor="personal-staff-rol" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Rol
            </label>
            <select
              id="personal-staff-rol"
              value={rol}
              onChange={(e) => setRol(e.target.value as typeof rol)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            >
              <option value="vendedor">Vendedor</option>
              <option value="admin_cooperativa">Administrador</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={guardandoStaff}
            className="h-[42px] w-fit rounded-lg bg-brand-amber px-5 font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-50 sm:col-span-2 lg:col-span-4"
          >
            {guardandoStaff ? "Creando..." : "Crear usuario"}
          </button>
          {errorStaff && (
            <p className="sm:col-span-2 lg:col-span-4 text-sm font-medium text-red-600">{errorStaff}</p>
          )}
        </form>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {staff !== null && staff.length === 0 && (
            <p className="px-6 py-6 text-center text-sm text-brand-dark/50">
              Todavía no has creado ningún usuario adicional.
            </p>
          )}
          {staff !== null && staff.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                <tr>
                  <th className="px-6 py-3">Nombre</th>
                  <th className="px-6 py-3">Correo</th>
                  <th className="px-6 py-3">Rol</th>
                  <th className="px-6 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td className="px-6 py-3 font-medium text-brand-dark">{s.nombreCompleto}</td>
                    <td className="px-6 py-3 text-brand-dark/70">{s.correo}</td>
                    <td className="px-6 py-3 text-brand-dark/70">{ETIQUETA_ROL[s.rol]}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          s.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {s.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ─── Conductores ─── */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-brand-dark">Conductores</h2>

        <form
          onSubmit={crearConductor}
          className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-3 lg:items-end"
        >
          <div>
            <label htmlFor="personal-conductor-nombre" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Nombre completo
            </label>
            <input
              id="personal-conductor-nombre"
              type="text"
              value={nombreConductor}
              onChange={(e) => setNombreConductor(e.target.value)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label htmlFor="personal-conductor-cedula" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Cédula
            </label>
            <input
              id="personal-conductor-cedula"
              type="text"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label htmlFor="personal-conductor-licencia-numero" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Número de licencia (opcional)
            </label>
            <input
              id="personal-conductor-licencia-numero"
              type="text"
              value={licenciaNumero}
              onChange={(e) => setLicenciaNumero(e.target.value)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label htmlFor="personal-conductor-licencia-categoria" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Categoría de licencia (opcional)
            </label>
            <input
              id="personal-conductor-licencia-categoria"
              type="text"
              value={licenciaCategoria}
              onChange={(e) => setLicenciaCategoria(e.target.value)}
              placeholder="Ej. E"
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label htmlFor="personal-conductor-telefono" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
              Teléfono (opcional)
            </label>
            <input
              id="personal-conductor-telefono"
              type="text"
              value={telefonoConductor}
              onChange={(e) => setTelefonoConductor(e.target.value)}
              className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <button
            type="submit"
            disabled={guardandoConductor}
            className="h-[42px] w-fit rounded-lg bg-brand-amber px-5 font-semibold text-brand-dark transition hover:brightness-95 disabled:opacity-50"
          >
            {guardandoConductor ? "Guardando..." : "Registrar conductor"}
          </button>
          {errorConductor && (
            <p className="sm:col-span-2 lg:col-span-3 text-sm font-medium text-red-600">{errorConductor}</p>
          )}
        </form>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {conductores !== null && conductores.length === 0 && (
            <p className="px-6 py-6 text-center text-sm text-brand-dark/50">
              Todavía no has registrado ningún conductor.
            </p>
          )}
          {conductores !== null && conductores.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="bg-brand-light/40 text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
                <tr>
                  <th className="px-6 py-3">Nombre</th>
                  <th className="px-6 py-3">Cédula</th>
                  <th className="px-6 py-3">Licencia</th>
                  <th className="px-6 py-3">Teléfono</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {conductores.map((c) => (
                  <tr key={c.id}>
                    <td className="px-6 py-3 font-medium text-brand-dark">{c.nombreCompleto}</td>
                    <td className="px-6 py-3 text-brand-dark/70">{c.cedula}</td>
                    <td className="px-6 py-3 text-brand-dark/70">
                      {c.licenciaNumero ? `${c.licenciaNumero}${c.licenciaCategoria ? ` (${c.licenciaCategoria})` : ""}` : "—"}
                    </td>
                    <td className="px-6 py-3 text-brand-dark/70">{c.telefono ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
