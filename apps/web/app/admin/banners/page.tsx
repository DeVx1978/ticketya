"use client";

import { useEffect, useState } from "react";
import {
  listarBannersPropiosAdmin,
  crearBannerPropioAdmin,
  actualizarBannerPropioAdmin,
  eliminarBannerPropioAdmin,
  type BannerPropio,
} from "@/lib/api";
import { obtenerToken } from "@/lib/auth";
import { Toast } from "@/components/Toast";

export default function BannersAdminPage() {
  const [banners, setBanners] = useState<BannerPropio[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [enlaceUrl, setEnlaceUrl] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  function cargar() {
    const token = obtenerToken();
    if (!token) return;
    listarBannersPropiosAdmin(token)
      .then(setBanners)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los banners."));
  }

  useEffect(cargar, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setErrorForm(null);
    const token = obtenerToken();
    if (!token || !titulo.trim() || !imagenUrl.trim() || !enlaceUrl.trim()) {
      setErrorForm("Completa título, imagen y enlace para continuar.");
      return;
    }
    setGuardando(true);
    try {
      await crearBannerPropioAdmin(token, {
        titulo: titulo.trim(),
        imagenUrl: imagenUrl.trim(),
        enlaceUrl: enlaceUrl.trim(),
      });
      setTitulo("");
      setImagenUrl("");
      setEnlaceUrl("");
      setMensajeExito(`Banner "${titulo.trim()}" creado correctamente.`);
      cargar();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo crear el banner.";
      setErrorForm(mensaje);
      setMensajeError(mensaje);
    } finally {
      setGuardando(false);
    }
  }

  async function alternarActivo(banner: BannerPropio) {
    const token = obtenerToken();
    if (!token) return;
    try {
      await actualizarBannerPropioAdmin(token, banner.id, { activo: !banner.activo });
      cargar();
    } catch (err) {
      setMensajeError(err instanceof Error ? err.message : "No se pudo actualizar el banner.");
    }
  }

  async function eliminar(banner: BannerPropio) {
    const token = obtenerToken();
    if (!token) return;
    try {
      await eliminarBannerPropioAdmin(token, banner.id);
      setMensajeExito(`Banner "${banner.titulo}" eliminado.`);
      cargar();
    } catch (err) {
      setMensajeError(err instanceof Error ? err.message : "No se pudo eliminar el banner.");
    }
  }

  return (
    <div className="space-y-6">
      <Toast mensaje={mensajeExito} onCerrar={() => setMensajeExito(null)} />
      <Toast mensaje={mensajeError} onCerrar={() => setMensajeError(null)} tipo="error" />

      <div>
        <h1 className="font-display text-2xl font-bold text-brand-dark">Banners propios</h1>
        <p className="mt-1 text-sm text-brand-dark/70">
          Promoción de productos propios (DevX, Surebets24/7, el terminal, etc.) en la portada — no es venta a
          terceros, esa parte del sistema comercial llega más adelante.
        </p>
      </div>

      <form onSubmit={crear} className="grid grid-cols-1 gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:grid-cols-2">
        <div>
          <label htmlFor="banner-titulo" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Título (interno, no se muestra)
          </label>
          <input
id="banner-titulo"
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="DevX — servicios de desarrollo"
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div>
          <label htmlFor="banner-enlace" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            Enlace al hacer clic
          </label>
          <input
id="banner-enlace"
            type="text"
            value={enlaceUrl}
            onChange={(e) => setEnlaceUrl(e.target.value)}
            placeholder="https://devx.example.com"
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="banner-imagen" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-dark/70">
            URL de la imagen
          </label>
          <input
id="banner-imagen"
            type="text"
            value={imagenUrl}
            onChange={(e) => setImagenUrl(e.target.value)}
            placeholder="https://res.cloudinary.com/tu-cuenta/banner.png"
            className="w-full rounded-lg border border-brand-light bg-white px-3 py-2.5 text-base text-brand-dark placeholder:text-brand-dark/35 focus:outline-none focus:ring-2 focus:ring-brand-medium"
          />
        </div>

        {errorForm && <p className="sm:col-span-2 text-sm font-medium text-red-600">{errorForm}</p>}

        <button
          type="submit"
          disabled={guardando}
          className="h-[42px] w-fit rounded-lg bg-brand px-5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50 sm:col-span-2"
        >
          {guardando ? "Creando..." : "Crear banner"}
        </button>
      </form>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {banners === null && <p className="text-sm text-brand-dark/50">Cargando...</p>}
        {banners !== null && banners.length === 0 && (
          <p className="rounded-2xl bg-white px-6 py-8 text-center text-sm text-brand-dark/50 shadow-sm ring-1 ring-black/5">
            Todavía no hay banners — usa el formulario de arriba.
          </p>
        )}
        {banners?.map((b) => (
          <div
            key={b.id}
            className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- URL externa dinámica, no un asset local */}
            <img src={b.imagenUrl} alt={b.titulo} className="h-16 w-28 rounded-lg object-cover ring-1 ring-black/5" />
            <div className="flex-1">
              <p className="font-semibold text-brand-dark">{b.titulo}</p>
              <p className="truncate text-xs text-brand-dark/50">{b.enlaceUrl}</p>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                b.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {b.activo ? "Activo" : "Inactivo"}
            </span>
            <button
              onClick={() => alternarActivo(b)}
              className="rounded-lg border border-brand-light px-3 py-1.5 text-sm font-semibold text-brand-dark/70 transition hover:bg-brand-light/40"
            >
              {b.activo ? "Desactivar" : "Activar"}
            </button>
            <button
              onClick={() => eliminar(b)}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
