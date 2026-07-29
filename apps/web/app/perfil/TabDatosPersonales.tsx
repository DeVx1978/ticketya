"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { actualizarMiPerfil, cambiarPassword, subirFotoPerfil, solicitarCambioCorreo, type MiPerfil } from "@/lib/api";
import { tokenValido, borrarToken } from "@/lib/auth";
import { CampoPassword } from "@/components/CampoPassword";

const ETIQUETA_ROL: Record<string, string> = {
  pasajero: "Pasajero",
  vendedor: "Vendedor",
  admin_cooperativa: "Administrador de cooperativa",
  admin_plataforma: "Administrador de plataforma",
};

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "long",
  });
}

export function TabDatosPersonales({
  perfil,
  onActualizado,
  onExito,
}: {
  perfil: MiPerfil;
  onActualizado: (cambios: Partial<MiPerfil>) => void;
  onExito: (mensaje: string) => void;
}) {
  const router = useRouter();
  const [nombreCompleto, setNombreCompleto] = useState(perfil.nombreCompleto);
  const [telefono, setTelefono] = useState(perfil.telefono ?? "");
  const [fotoUrl, setFotoUrl] = useState(perfil.fotoUrl ?? "");
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState<string | null>(null);

  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [errorPassword, setErrorPassword] = useState<string | null>(null);

  const [correoNuevo, setCorreoNuevo] = useState("");
  const [passwordParaCorreo, setPasswordParaCorreo] = useState("");
  const [solicitandoCambioCorreo, setSolicitandoCambioCorreo] = useState(false);
  const [errorCambioCorreo, setErrorCambioCorreo] = useState<string | null>(null);
  const [correoSolicitudEnviada, setCorreoSolicitudEnviada] = useState(false);

  async function guardarPerfil(e: React.FormEvent) {
    e.preventDefault();
    setErrorPerfil(null);
    const token = tokenValido();
    if (!token) return;
    setGuardandoPerfil(true);
    try {
      await actualizarMiPerfil(token, {
        nombreCompleto: nombreCompleto.trim(),
        telefono: telefono.trim(),
        fotoUrl: fotoUrl.trim(),
      });
      onActualizado({ nombreCompleto, telefono, fotoUrl });
      onExito("Perfil actualizado.");
    } catch (err) {
      setErrorPerfil(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardandoPerfil(false);
    }
  }

  async function guardarPassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorPassword(null);
    const token = tokenValido();
    if (!token) return;
    setCambiandoPassword(true);
    try {
      await cambiarPassword(token, passwordActual, passwordNueva);
      setPasswordActual("");
      setPasswordNueva("");
      onExito("Contraseña actualizada.");
    } catch (err) {
      setErrorPassword(err instanceof Error ? err.message : "No se pudo cambiar la contraseña.");
    } finally {
      setCambiandoPassword(false);
    }
  }

  /**
   * Cambio de correo (29-jul-2026, hallazgo real del usuario) — sin
   * esto, quien pierde acceso a su correo queda fuera de su cuenta
   * para siempre. El correo no cambia todavía aquí: recién cambia
   * cuando el usuario confirma desde el enlace que le llega al correo
   * nuevo (ver /confirmar-cambio-correo).
   */
  async function solicitarCambio(e: React.FormEvent) {
    e.preventDefault();
    setErrorCambioCorreo(null);
    const token = tokenValido();
    if (!token) return;
    setSolicitandoCambioCorreo(true);
    try {
      await solicitarCambioCorreo(token, correoNuevo, passwordParaCorreo);
      setCorreoSolicitudEnviada(true);
      setPasswordParaCorreo("");
    } catch (err) {
      setErrorCambioCorreo(
        err instanceof Error ? err.message : "No se pudo solicitar el cambio de correo.",
      );
    } finally {
      setSolicitandoCambioCorreo(false);
    }
  }

  function cerrarSesion() {
    borrarToken();
    router.push("/");
  }

  return (
    <>
      {/* Tarjeta de identidad — el vistazo "exclusivo" del perfil */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-dark via-brand to-brand-medium p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          {perfil.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL externa dinámica, no un asset local
            <img
              src={perfil.fotoUrl}
              alt={perfil.nombreCompleto}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-white/40"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold ring-2 ring-white/40">
              {perfil.nombreCompleto.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-display text-xl font-extrabold">{perfil.nombreCompleto}</p>
            <p className="text-sm text-white/75">{ETIQUETA_ROL[perfil.rol]}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-6 border-t border-white/20 pt-4 text-sm">
          <div>
            <p className="text-white/60">Miembro desde</p>
            <p className="font-semibold">{formatearFecha(perfil.creadoEn)}</p>
          </div>
          {perfil.viajesCompletados !== undefined && (
            <div>
              <p className="text-white/60">Viajes completados</p>
              <p className="font-semibold">{perfil.viajesCompletados}</p>
            </div>
          )}
        </div>
      </div>

      {/* Datos editables */}
      <form
        onSubmit={guardarPerfil}
        className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
      >
        <h2 className="font-display text-base font-bold text-brand-dark">Mis datos</h2>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
            Correo
          </label>
          <input
            type="text"
            value={perfil.correo}
            disabled
            className="w-full rounded-lg border border-brand-light bg-brand-light/30 px-3 py-2.5 text-base text-brand-dark/50"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
            Nombre completo
          </label>
          <input
            type="text"
            value={nombreCompleto}
            onChange={(e) => setNombreCompleto(e.target.value)}
            className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
            WhatsApp
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10 dígitos"
            className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
            Foto de perfil
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={async (e) => {
              const archivo = e.target.files?.[0];
              if (!archivo) return;
              const token = tokenValido();
              if (!token) return;
              setErrorPerfil(null);
              setSubiendoFoto(true);
              try {
                const url = await subirFotoPerfil(token, archivo);
                setFotoUrl(url);
                onActualizado({ fotoUrl: url });
                onExito("Foto de perfil actualizada.");
              } catch (err) {
                setErrorPerfil(err instanceof Error ? err.message : "No se pudo subir la foto.");
              } finally {
                setSubiendoFoto(false);
              }
            }}
            disabled={subiendoFoto}
            className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-sm text-brand-dark file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white disabled:opacity-50"
          />
          {subiendoFoto && <p className="mt-1 text-xs text-brand-dark/60">Subiendo…</p>}
          <p className="mt-1 text-xs text-brand-dark/50">JPG, PNG o WEBP, hasta 5 MB.</p>
        </div>
        {errorPerfil && <p className="text-sm font-medium text-red-600">{errorPerfil}</p>}
        <button
          type="submit"
          disabled={guardandoPerfil}
          className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {guardandoPerfil ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>

      {/* Cambiar contraseña */}
      <form
        onSubmit={guardarPassword}
        className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
      >
        <h2 className="font-display text-base font-bold text-brand-dark">Cambiar contraseña</h2>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
            Contraseña actual
          </label>
          <CampoPassword value={passwordActual} onChange={setPasswordActual} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
            Nueva contraseña
          </label>
          <CampoPassword value={passwordNueva} onChange={setPasswordNueva} placeholder="Mínimo 8 caracteres" />
        </div>
        {errorPassword && <p className="text-sm font-medium text-red-600">{errorPassword}</p>}
        <button
          type="submit"
          disabled={cambiandoPassword || !passwordActual || !passwordNueva}
          className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {cambiandoPassword ? "Cambiando..." : "Cambiar contraseña"}
        </button>
      </form>

      {/* Cambiar correo — hallazgo real del usuario (29-jul-2026): si pierdes acceso a tu correo, quedarías fuera de tu cuenta sin esto. */}
      <form
        onSubmit={solicitarCambio}
        className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
      >
        <h2 className="font-display text-base font-bold text-brand-dark">Cambiar correo</h2>
        <p className="text-xs text-brand-dark/50">
          Correo actual: <span className="font-semibold">{perfil.correo}</span>
        </p>
        {correoSolicitudEnviada ? (
          <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            Te enviamos un enlace de confirmación a tu correo nuevo. Tu correo actual sigue activo
            hasta que confirmes.
          </p>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
                Correo nuevo
              </label>
              <input
                type="email"
                value={correoNuevo}
                onChange={(e) => setCorreoNuevo(e.target.value)}
                className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
                Tu contraseña actual (para confirmar que eres tú)
              </label>
              <CampoPassword value={passwordParaCorreo} onChange={setPasswordParaCorreo} />
            </div>
            {errorCambioCorreo && (
              <p className="text-sm font-medium text-red-600">{errorCambioCorreo}</p>
            )}
            <button
              type="submit"
              disabled={solicitandoCambioCorreo || !correoNuevo || !passwordParaCorreo}
              className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {solicitandoCambioCorreo ? "Enviando..." : "Solicitar cambio de correo"}
            </button>
          </>
        )}
      </form>

      <button
        onClick={cerrarSesion}
        className="mt-6 w-full rounded-lg border border-brand-light px-5 py-2.5 text-sm font-semibold text-brand-dark/70 transition hover:bg-brand-light/40"
      >
        Cerrar sesión
      </button>
    </>
  );
}
