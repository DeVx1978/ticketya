"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { obtenerMiPerfil, type MiPerfil } from "@/lib/api";
import { tokenValido } from "@/lib/auth";
import { Toast } from "@/components/Toast";
import { TabDatosPersonales } from "./TabDatosPersonales";
import { TabMisBoletos } from "./TabMisBoletos";
import { TabMisCreditos } from "./TabMisCreditos";

/**
 * "Mi cuenta" unificada (29-jul-2026) — antes, datos personales y
 * boletos vivían en dos páginas sueltas (/perfil y /mis-boletos), sin
 * conexión visual entre sí. Ahora es una sola sección con pestañas,
 * el patrón que usan las mejores plataformas (una sola "área de
 * cuenta", no pantallas dispersas).
 */
const PESTANAS = [
  { valor: "datos", etiqueta: "Mis datos" },
  { valor: "boletos", etiqueta: "Mis boletos" },
  { valor: "creditos", etiqueta: "Mis créditos" },
] as const;

type Pestana = (typeof PESTANAS)[number]["valor"];

function MiCuenta() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [perfil, setPerfil] = useState<MiPerfil | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const pestanaParam = searchParams.get("tab");
  const pestanaActiva: Pestana =
    pestanaParam === "boletos" || pestanaParam === "creditos" ? pestanaParam : "datos";

  useEffect(() => {
    const token = tokenValido();
    if (!token) {
      router.push(`/ingresar?volverA=${encodeURIComponent("/perfil")}`);
      return;
    }
    obtenerMiPerfil(token)
      .then(setPerfil)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar tu perfil."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cambiarPestana(valor: Pestana) {
    router.push(`/perfil?tab=${valor}`);
  }

  if (error) {
    return (
      <main className="mx-auto max-w-lg flex-1 px-4 py-16">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      </main>
    );
  }

  if (!perfil) {
    return (
      <main className="mx-auto max-w-lg flex-1 px-4 py-16 text-center text-sm text-brand-dark/50">
        Cargando...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg flex-1 px-4 py-10">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />

      <h1 className="font-display text-2xl font-bold text-brand-dark">Mi cuenta</h1>

      <div className="mt-4 flex gap-1 border-b border-black/5">
        {PESTANAS.map((p) => (
          <button
            key={p.valor}
            onClick={() => cambiarPestana(p.valor)}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition ${
              pestanaActiva === p.valor
                ? "border-b-2 border-brand text-brand-dark"
                : "text-brand-dark/50 hover:text-brand-dark/80"
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {pestanaActiva === "datos" && (
          <TabDatosPersonales
            perfil={perfil}
            onActualizado={(cambios) => setPerfil((p) => (p ? { ...p, ...cambios } : p))}
            onExito={setMensajeExito}
          />
        )}
        {pestanaActiva === "boletos" && <TabMisBoletos onExito={setMensajeExito} />}
        {pestanaActiva === "creditos" && <TabMisCreditos />}
      </div>
    </main>
  );
}

export default function PerfilPage() {
  return (
    <Suspense fallback={null}>
      <MiCuenta />
    </Suspense>
  );
}
