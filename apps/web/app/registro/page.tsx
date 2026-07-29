"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { registrar } from "@/lib/api";
import { guardarToken } from "@/lib/auth";
import { CampoPassword } from "@/components/CampoPassword";

/** Solo deja escribir dígitos, y corta en la cantidad exacta que pide cada documento. */
function soloDigitos(valor: string, maximo: number) {
  return valor.replace(/\D/g, "").slice(0, maximo);
}

function FormularioRegistro() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (cedula.length !== 10) {
      setError("La cédula debe tener exactamente 10 dígitos.");
      return;
    }
    if (telefono.length !== 10) {
      setError("El WhatsApp debe tener exactamente 10 dígitos.");
      return;
    }
    setCargando(true);
    try {
      const { accessToken } = await registrar({
        correo,
        password,
        nombres,
        apellidos,
        cedula,
        telefono,
      });
      guardarToken(accessToken);
      const volverA = searchParams.get("volverA");
      router.push(volverA ?? "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar el registro.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-brand-light/40 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg ring-1 ring-black/5">
        <h1 className="font-display text-2xl font-bold text-brand-dark">Crear cuenta</h1>
        <p className="mt-1 text-sm text-brand-dark/60">Regístrate para comprar tu pasaje.</p>

        <form onSubmit={enviar} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
                Nombres
              </label>
              <input
                type="text"
                required
                minLength={2}
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
                Apellidos
              </label>
              <input
                type="text"
                required
                minLength={2}
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              Cédula
            </label>
            <input
              type="text"
              inputMode="numeric"
              required
              value={cedula}
              onChange={(e) => setCedula(soloDigitos(e.target.value, 10))}
              placeholder="10 dígitos"
              className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
            {cedula.length > 0 && cedula.length < 10 && (
              <p className="mt-1 text-xs text-brand-dark/50">{cedula.length}/10 dígitos</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              WhatsApp
            </label>
            <input
              type="text"
              inputMode="numeric"
              required
              value={telefono}
              onChange={(e) => setTelefono(soloDigitos(e.target.value, 10))}
              placeholder="10 dígitos, ej. 0991234567"
              className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
            {telefono.length > 0 && telefono.length < 10 && (
              <p className="mt-1 text-xs text-brand-dark/50">{telefono.length}/10 dígitos</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              Correo
            </label>
            <input
              type="email"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="w-full rounded-lg border border-brand-light px-3 py-2.5 text-base text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-medium"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/60">
              Contraseña (mínimo 8 caracteres)
            </label>
            <CampoPassword value={password} onChange={setPassword} />
          </div>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-lg bg-brand px-6 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {cargando ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-brand-dark/60">
          ¿Ya tienes cuenta?{" "}
          <Link
            href={`/ingresar${searchParams.get("volverA") ? `?volverA=${encodeURIComponent(searchParams.get("volverA")!)}` : ""}`}
            className="font-semibold text-brand hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function RegistroPage() {
  return (
    <Suspense fallback={null}>
      <FormularioRegistro />
    </Suspense>
  );
}
