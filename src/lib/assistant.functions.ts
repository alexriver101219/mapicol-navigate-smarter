import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { PlaceResult } from "./maps.functions";

const AskSchema = z.object({
  prompt: z.string().trim().min(2).max(400),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type AssistantAnswer = {
  reply: string;
  category: string;
  places: PlaceResult[];
};

const CATEGORY_TYPES: Record<string, string[]> = {
  restaurante: ["restaurant"],
  parqueadero: ["parking"],
  centro_comercial: ["shopping_mall"],
  gasolinera: ["gas_station"],
  carga_electrica: ["electric_vehicle_charging_station"],
};

const MODEL = "google/gemini-3.7-flash";

async function callGateway(body: unknown): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("El asistente de IA no está configurado.");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (response.status === 429) {
    throw new Error("El asistente está recibiendo muchas solicitudes. Intenta en unos segundos.");
  }
  if (response.status === 402) {
    throw new Error("Se agotaron los créditos de IA del espacio de trabajo.");
  }
  if (!response.ok) {
    const text = await response.text();
    console.error(`AI gateway error [${response.status}]: ${text}`);
    throw new Error("El asistente de IA no está disponible en este momento.");
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskSchema.parse(input))
  .handler(async ({ data, context }): Promise<AssistantAnswer> => {
    const { data: profile, error } = await context.supabase
      .from("profiles")
      .select("plan")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile || (profile as { plan: string }).plan !== "pro") {
      throw new Error("El asistente de IA está disponible en el plan MapiCol Pro.");
    }

    const intentRaw = await callGateway({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            'Clasificas peticiones de un conductor en Colombia. Responde SOLO JSON con {"category":"restaurante|parqueadero|centro_comercial|gasolinera|carga_electrica|cualquiera","keyword":"texto corto de búsqueda"}. Sin explicaciones.',
        },
        { role: "user", content: data.prompt },
      ],
      response_format: { type: "json_object" },
    });

    let category = "cualquiera";
    let keyword = data.prompt;
    try {
      const parsed = JSON.parse(intentRaw) as { category?: string; keyword?: string };
      if (parsed.category) category = parsed.category;
      if (parsed.keyword) keyword = parsed.keyword;
    } catch {
      /* usamos los valores por defecto */
    }

    const { mapsPost } = await import("./google-maps.server");
    const fieldMask =
      "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours.openNow,places.priceLevel";
    const types = CATEGORY_TYPES[category];

    const raw = await mapsPost<{
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
    }>(
      types ? "/places/v1/places:searchNearby" : "/places/v1/places:searchText",
      types
        ? {
            includedTypes: types,
            maxResultCount: 8,
            languageCode: "es",
            locationRestriction: {
              circle: { center: { latitude: data.lat, longitude: data.lng }, radius: 6000 },
            },
          }
        : {
            textQuery: keyword,
            languageCode: "es",
            maxResultCount: 8,
            locationBias: {
              circle: { center: { latitude: data.lat, longitude: data.lng }, radius: 6000 },
            },
          },
      { "X-Goog-FieldMask": fieldMask },
    );

    const places: PlaceResult[] = (raw.places ?? [])
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

    const reply = await callGateway({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "Eres el asistente de MapiCol, una app de navegación colombiana. Recomiendas lugares con tono cercano y breve (máximo 90 palabras). Usa las valoraciones y si están abiertos. Nunca inventes lugares que no estén en la lista.",
        },
        {
          role: "user",
          content: `Petición: ${data.prompt}\n\nLugares encontrados:\n${
            places.length
              ? places
                  .map(
                    (p, i) =>
                      `${i + 1}. ${p.name} — ${p.address} — ${p.rating ?? "sin"} estrellas (${p.userRatingCount ?? 0} reseñas)${p.openNow === true ? " — abierto" : p.openNow === false ? " — cerrado" : ""}`,
                  )
                  .join("\n")
              : "No se encontraron lugares cercanos."
          }`,
        },
      ],
    });

    return { reply: reply || "No encontré resultados cercanos.", category, places };
  });
