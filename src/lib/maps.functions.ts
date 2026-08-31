import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type PlaceResult = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingCount?: number;
  openNow?: boolean;
  priceLevel?: string;
};

export type RouteResult = {
  distanceMeters: number;
  durationSeconds: number;
  staticDurationSeconds: number;
  polyline: string;
  summary: string;
  trafficLevel: "fluido" | "moderado" | "congestionado";
};

const CategorySchema = z.enum([
  "restaurante",
  "parqueadero",
  "centro_comercial",
  "gasolinera",
  "carga_electrica",
  "cualquiera",
]);

export type PlaceCategory = z.infer<typeof CategorySchema>;

const CATEGORY_TYPES: Record<PlaceCategory, string[]> = {
  restaurante: ["restaurant"],
  parqueadero: ["parking"],
  centro_comercial: ["shopping_mall"],
  gasolinera: ["gas_station"],
  carga_electrica: ["electric_vehicle_charging_station"],
  cualquiera: [],
};

const PLACE_FIELDS =
  "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours.openNow,places.priceLevel";

type RawPlaces = {
  places?: Array<{
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude: number; longitude: number };
    rating?: number;
    userRatingCount?: number;
    currentOpeningHours?: { openNow?: boolean };
    priceLevel?: string;
  }>;
};

function normalizePlaces(raw: RawPlaces): PlaceResult[] {
  return (raw.places ?? [])
    .filter((p) => p.location)
    .map((p) => ({
      id: p.id,
      name: p.displayName?.text ?? "Sin nombre",
      address: p.formattedAddress ?? "",
      lat: p.location!.latitude,
      lng: p.location!.longitude,
      rating: p.rating,
      userRatingCount: p.userRatingCount,
      openNow: p.currentOpeningHours?.openNow,
      priceLevel: p.priceLevel,
    }));
}

const SearchSchema = z.object({
  query: z.string().trim().min(2).max(120),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

/** Búsqueda de destino por texto (geocodificación amigable). */
export const searchDestinations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SearchSchema.parse(input))
  .handler(async ({ data }): Promise<PlaceResult[]> => {
    const { mapsPost } = await import("./google-maps.server");
    const body: Record<string, unknown> = {
      textQuery: data.query,
      languageCode: "es",
      maxResultCount: 8,
    };
    if (data.lat !== undefined && data.lng !== undefined) {
      body["locationBias"] = {
        circle: { center: { latitude: data.lat, longitude: data.lng }, radius: 50000 },
      };
    }
    const raw = await mapsPost<RawPlaces>("/places/v1/places:searchText", body, {
      "X-Goog-FieldMask": PLACE_FIELDS,
    });
    return normalizePlaces(raw);
  });

const NearbySchema = z.object({
  category: CategorySchema,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius: z.number().min(200).max(30000).default(4000),
  keyword: z.string().trim().max(80).optional(),
});

/** Lugares cercanos por categoría (restaurantes, parqueaderos, etc.). */
export const searchNearbyPlaces = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => NearbySchema.parse(input))
  .handler(async ({ data }): Promise<PlaceResult[]> => {
    const { mapsPost } = await import("./google-maps.server");
    const types = CATEGORY_TYPES[data.category];

    if (data.keyword || types.length === 0) {
      const raw = await mapsPost<RawPlaces>(
        "/places/v1/places:searchText",
        {
          textQuery: `${data.keyword ?? data.category.replace("_", " ")}`,
          languageCode: "es",
          maxResultCount: 10,
          locationBias: {
            circle: {
              center: { latitude: data.lat, longitude: data.lng },
              radius: data.radius,
            },
          },
        },
        { "X-Goog-FieldMask": PLACE_FIELDS },
      );
      return normalizePlaces(raw);
    }

    const raw = await mapsPost<RawPlaces>(
      "/places/v1/places:searchNearby",
      {
        includedTypes: types,
        maxResultCount: 10,
        languageCode: "es",
        locationRestriction: {
          circle: {
            center: { latitude: data.lat, longitude: data.lng },
            radius: data.radius,
          },
        },
      },
      { "X-Goog-FieldMask": PLACE_FIELDS },
    );
    return normalizePlaces(raw);
  });

const RouteSchema = z.object({
  origin: z.object({ lat: z.number(), lng: z.number() }),
  destination: z.object({ lat: z.number(), lng: z.number() }),
  travelMode: z.enum(["DRIVE", "TWO_WHEELER", "WALK", "TRANSIT"]).default("DRIVE"),
  avoidTolls: z.boolean().default(false),
});

type RawRoutes = {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    staticDuration?: string;
    description?: string;
    polyline?: { encodedPolyline?: string };
  }>;
};

const seconds = (value?: string) => (value ? Number.parseInt(value.replace("s", ""), 10) || 0 : 0);

/** Ruta con tráfico en tiempo real. */
export const computeRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RouteSchema.parse(input))
  .handler(async ({ data }): Promise<RouteResult[]> => {
    const { mapsPost } = await import("./google-maps.server");
    const isDrive = data.travelMode === "DRIVE" || data.travelMode === "TWO_WHEELER";
    const raw = await mapsPost<RawRoutes>(
      "/routes/directions/v2:computeRoutes",
      {
        origin: {
          location: {
            latLng: { latitude: data.origin.lat, longitude: data.origin.lng },
          },
        },
        destination: {
          location: {
            latLng: { latitude: data.destination.lat, longitude: data.destination.lng },
          },
        },
        travelMode: data.travelMode,
        ...(isDrive ? { routingPreference: "TRAFFIC_AWARE_OPTIMAL" } : {}),
        computeAlternativeRoutes: true,
        languageCode: "es-CO",
        units: "METRIC",
        ...(isDrive
          ? { routeModifiers: { avoidTolls: data.avoidTolls, avoidFerries: true } }
          : {}),
      },
      {
        "X-Goog-FieldMask":
          "routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.description",
      },
    );

    return (raw.routes ?? []).map((route) => {
      const duration = seconds(route.duration);
      const staticDuration = seconds(route.staticDuration) || duration;
      const ratio = staticDuration > 0 ? duration / staticDuration : 1;
      const trafficLevel: RouteResult["trafficLevel"] =
        ratio > 1.4 ? "congestionado" : ratio > 1.15 ? "moderado" : "fluido";
      return {
        distanceMeters: route.distanceMeters ?? 0,
        durationSeconds: duration,
        staticDurationSeconds: staticDuration,
        polyline: route.polyline?.encodedPolyline ?? "",
        summary: route.description ?? "Ruta sugerida",
        trafficLevel,
      };
    });
  });

const ReverseSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

type RawGeocode = {
  results?: Array<{
    formatted_address?: string;
    address_components?: Array<{ long_name: string; types: string[] }>;
  }>;
};

/** Convierte coordenadas en una dirección legible y detecta la ciudad. */
export const reverseGeocode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ReverseSchema.parse(input))
  .handler(async ({ data }): Promise<{ address: string; city: string | null }> => {
    const { mapsGet } = await import("./google-maps.server");
    const raw = await mapsGet<RawGeocode>(
      `/maps/api/geocode/json?latlng=${data.lat},${data.lng}&language=es`,
    );
    const first = raw.results?.[0];
    const city =
      first?.address_components?.find(
        (c) => c.types.includes("locality") || c.types.includes("administrative_area_level_2"),
      )?.long_name ?? null;
    return { address: first?.formatted_address ?? "Ubicación actual", city };
  });
