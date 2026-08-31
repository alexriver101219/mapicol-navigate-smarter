/// <reference types="google.maps" />
import { useEffect, useRef } from "react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { Loader2, MapPinOff } from "lucide-react";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  kind?: "origin" | "destination" | "place";
};

type Props = {
  center: { lat: number; lng: number };
  markers?: MapMarker[];
  polyline?: string | null;
  showTraffic?: boolean;
  zoom?: number;
  className?: string;
  onSelectMarker?: (id: string) => void;
};

const PIN_COLORS: Record<string, string> = {
  origin: "#1d4ed8",
  destination: "#dc2626",
  place: "#f5b301",
};

export function MapCanvas({
  center,
  markers = [],
  polyline = null,
  showTraffic = true,
  zoom = 13,
  className = "",
  onSelectMarker,
}: Props) {
  const { ready, error } = useGoogleMaps();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRefs = useRef<google.maps.Marker[]>([]);
  const pathRef = useRef<google.maps.Polyline | null>(null);
  const trafficRef = useRef<google.maps.TrafficLayer | null>(null);

  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    mapRef.current = new google.maps.Map(containerRef.current, {
      center,
      zoom,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
      clickableIcons: false,
    });
    trafficRef.current = new google.maps.TrafficLayer();
  }, [ready, center, zoom]);

  useEffect(() => {
    if (!mapRef.current || !trafficRef.current) return;
    trafficRef.current.setMap(showTraffic ? mapRef.current : null);
  }, [showTraffic, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.panTo(center);
  }, [center.lat, center.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRefs.current.forEach((m) => m.setMap(null));
    markerRefs.current = markers.map((marker) => {
      const instance = new google.maps.Marker({
        position: { lat: marker.lat, lng: marker.lng },
        map,
        title: marker.label ?? "",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: marker.kind === "place" ? 8 : 10,
          fillColor: PIN_COLORS[marker.kind ?? "place"] ?? PIN_COLORS["place"]!,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
      if (onSelectMarker) {
        instance.addListener("click", () => onSelectMarker(marker.id));
      }
      return instance;
    });
  }, [markers, ready, onSelectMarker]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    pathRef.current?.setMap(null);
    if (!polyline) return;

    const decoded = google.maps.geometry.encoding.decodePath(polyline);
    pathRef.current = new google.maps.Polyline({
      path: decoded,
      map,
      strokeColor: "#1d4ed8",
      strokeOpacity: 0.9,
      strokeWeight: 6,
    });
    const bounds = new google.maps.LatLngBounds();
    decoded.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds, 60);
  }, [polyline, ready]);

  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-muted text-muted-foreground ${className}`}
      >
        <MapPinOff className="size-6" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="size-full" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
