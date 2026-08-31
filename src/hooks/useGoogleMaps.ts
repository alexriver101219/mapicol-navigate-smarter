import { useEffect, useState } from "react";

declare global {
  interface Window {
    __mapicolMapsReady?: () => void;
    __mapicolMapsLoading?: boolean;
  }
}

let readyPromise: Promise<void> | null = null;

function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.google?.maps) return Promise.resolve();
  if (readyPromise) return readyPromise;

  const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as
    | string
    | undefined;
  const channel = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as
    | string
    | undefined;

  if (!key) return Promise.reject(new Error("Falta la llave del mapa."));

  readyPromise = new Promise<void>((resolve, reject) => {
    window.__mapicolMapsReady = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&language=es&region=CO&libraries=geometry&callback=__mapicolMapsReady${
      channel ? `&channel=${channel}` : ""
    }`;
    script.async = true;
    script.onerror = () => reject(new Error("No se pudo cargar Google Maps."));
    document.head.appendChild(script);
  });

  return readyPromise;
}

export function useGoogleMaps() {
  const [ready, setReady] = useState(
    typeof window !== "undefined" && Boolean(window.google?.maps),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadMaps()
      .then(() => active && setReady(true))
      .catch((err: Error) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, []);

  return { ready, error };
}
