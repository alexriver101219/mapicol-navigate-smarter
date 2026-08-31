import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  searchDestinations,
  searchNearbyPlaces,
  computeRoute,
  reverseGeocode,
  type PlaceResult,
  type RouteResult,
} from "@/lib/maps.functions";
import { getMyProfile, saveRoute } from "@/lib/profile.functions";
import { MapCanvas, type MapMarker } from "@/components/MapCanvas";
import { VoiceInput } from "@/components/VoiceInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Navigation, Search, TrafficCone } from "lucide-react";

const BOGOTA = { lat: 4.711, lng: -74.0721 };

const CATEGORIES = [
  { key: "restaurante", label: "Restaurantes" },
  { key: "parqueadero", label: "Parqueaderos" },
  { key: "centro_comercial", label: "Centros comerciales" },
  { key: "gasolinera", label: "Gasolineras" },
  { key: "carga_electrica", label: "Carga eléctrica" },
] as const;

export const Route = createFileRoute("/_authenticated/mapa")({
  head: () => ({
    meta: [
      { title: "Navegación con tráfico en vivo | MapiCol" },
      {
        name: "description",
        content:
          "Planifica tu ruta en Colombia con tráfico en tiempo real, búsqueda por voz y lugares cercanos.",
      },
      { property: "og:title", content: "Navegación con tráfico en vivo | MapiCol" },
      {
        property: "og:description",
        content: "Rutas con tráfico real y comandos por voz en MapiCol.",
      },
    ],
  }),
  component: MapaPage,
});

function formatDuration(seconds: number) {
  const min = Math.round(seconds / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

function MapaPage() {
  const [position, setPosition] = useState(BOGOTA);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [destination, setDestination] = useState<PlaceResult | null>(null);
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [activeRoute, setActiveRoute] = useState(0);
  const [showTraffic, setShowTraffic] = useState(true);
  const [avoidTolls, setAvoidTolls] = useState(false);

  const search = useServerFn(searchDestinations);
  const nearby = useServerFn(searchNearbyPlaces);
  const route = useServerFn(computeRoute);
  const geocode = useServerFn(reverseGeocode);
  const persistRoute = useServerFn(saveRoute);
  const profileFn = useServerFn(getMyProfile);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => profileFn({}) });

  const { data: currentAddress } = useQuery({
    queryKey: ["reverse", position.lat.toFixed(3), position.lng.toFixed(3)],
    queryFn: () => geocode({ data: { lat: position.lat, lng: position.lng } }),
  });

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const searchMutation = useMutation({
    mutationFn: (text: string) =>
      search({ data: { query: text, lat: position.lat, lng: position.lng } }),
    onSuccess: (places) => {
      setResults(places);
      if (places.length === 0) toast.info("No encontramos ese destino.");
    },
    onError: () => toast.error("No pudimos buscar el destino."),
  });

  const nearbyMutation = useMutation({
    mutationFn: (category: (typeof CATEGORIES)[number]["key"]) =>
      nearby({ data: { category, lat: position.lat, lng: position.lng, radius: 5000 } }),
    onSuccess: (places) => setResults(places),
    onError: () => toast.error("No pudimos buscar lugares cercanos."),
  });

  const routeMutation = useMutation({
    mutationFn: (place: PlaceResult) =>
      route({
        data: {
          origin: position,
          destination: { lat: place.lat, lng: place.lng },
          travelMode: profile?.vehicle_type === "motorcycle" ? "TWO_WHEELER" : "DRIVE",
          avoidTolls,
        },
      }),
    onSuccess: async (data, place) => {
      setRoutes(data);
      setActiveRoute(0);
      setDestination(place);
      const best = data[0];
      if (best) {
        await persistRoute({
          data: {
            origin_label: currentAddress?.address ?? "Mi ubicación",
            destination_label: place.name,
            origin_lat: position.lat,
            origin_lng: position.lng,
            destination_lat: place.lat,
            destination_lng: place.lng,
            distance_meters: Math.round(best.distanceMeters),
            duration_seconds: Math.round(best.durationSeconds),
          },
        }).catch(() => undefined);
      }
    },
    onError: () => toast.error("No pudimos calcular la ruta."),
  });

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = [
      { id: "origin", lat: position.lat, lng: position.lng, label: "Mi ubicación", kind: "origin" },
    ];
    results.forEach((place) =>
      list.push({
        id: place.id,
        lat: place.lat,
        lng: place.lng,
        label: place.name,
        kind: destination?.id === place.id ? "destination" : "place",
      }),
    );
    return list;
  }, [position, results, destination]);

  const selected = routes[activeRoute];

  return (
    <div className="grid gap-0 lg:grid-cols-[380px_1fr]">
      <aside className="order-2 space-y-4 border-r border-border p-4 lg:order-1 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim().length >= 2) searchMutation.mutate(query.trim());
          }}
          className="flex gap-2"
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="¿A dónde vamos?"
            maxLength={120}
            aria-label="Buscar destino"
          />
          <Button type="submit" size="icon" disabled={searchMutation.isPending}>
            {searchMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
          </Button>
          <VoiceInput
            size="icon"
            onTranscript={(text) => {
              setQuery(text);
              searchMutation.mutate(text);
            }}
          />
        </form>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <Button
              key={category.key}
              variant="outline"
              size="sm"
              onClick={() => nearbyMutation.mutate(category.key)}
              disabled={nearbyMutation.isPending}
            >
              {category.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div className="flex items-center gap-2">
            <TrafficCone className="size-4 text-primary" />
            <Label htmlFor="traffic">Tráfico en vivo</Label>
          </div>
          <Switch id="traffic" checked={showTraffic} onCheckedChange={setShowTraffic} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <Label htmlFor="tolls">Evitar peajes</Label>
          <Switch id="tolls" checked={avoidTolls} onCheckedChange={setAvoidTolls} />
        </div>

        {selected && (
          <Card className="space-y-2 p-4">
            <p className="text-sm text-muted-foreground">
              Hacia <span className="font-medium text-foreground">{destination?.name}</span>
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold">{formatDuration(selected.durationSeconds)}</span>
              <span className="text-sm text-muted-foreground">
                {(selected.distanceMeters / 1000).toFixed(1)} km
              </span>
            </div>
            <Badge
              variant={
                selected.trafficLevel === "congestionado"
                  ? "destructive"
                  : selected.trafficLevel === "moderado"
                    ? "secondary"
                    : "default"
              }
            >
              Tráfico {selected.trafficLevel}
            </Badge>
            {routes.length > 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {routes.map((alt, index) => (
                  <Button
                    key={`${alt.polyline.slice(0, 12)}-${index}`}
                    size="sm"
                    variant={index === activeRoute ? "default" : "outline"}
                    onClick={() => setActiveRoute(index)}
                  >
                    Ruta {index + 1} · {formatDuration(alt.durationSeconds)}
                  </Button>
                ))}
              </div>
            )}
          </Card>
        )}

        <div className="space-y-2">
          {results.map((place) => (
            <Card key={place.id} className="space-y-1 p-3">
              <p className="font-medium leading-tight">{place.name}</p>
              <p className="text-xs text-muted-foreground">{place.address}</p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">
                  {place.rating ? `★ ${place.rating} (${place.userRatingCount ?? 0})` : "Sin reseñas"}
                </span>
                <Button
                  size="sm"
                  onClick={() => routeMutation.mutate(place)}
                  disabled={routeMutation.isPending}
                  className="gap-1"
                >
                  <Navigation className="size-3" />
                  Ir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </aside>

      <MapCanvas
        className="order-1 h-[45vh] w-full lg:order-2 lg:h-[calc(100vh-3.5rem)]"
        center={position}
        markers={markers}
        polyline={selected?.polyline ?? null}
        showTraffic={showTraffic}
      />
    </div>
  );
}
