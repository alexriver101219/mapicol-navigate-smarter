import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type Profile = {
  id: string;
  full_name: string | null;
  city: string | null;
  plate: string | null;
  vehicle_type: string;
  plan: "free" | "pro";
};

export type RouteHistoryItem = {
  id: string;
  origin_label: string;
  destination_label: string;
  distance_meters: number | null;
  duration_seconds: number | null;
  created_at: string;
};

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Profile | null> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, full_name, city, plate, vehicle_type, plan")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Profile | null) ?? null;
  });

const ProfileUpdateSchema = z.object({
  full_name: z.string().trim().max(80).nullable(),
  city: z.string().trim().max(60).nullable(),
  plate: z
    .string()
    .trim()
    .max(10)
    .regex(/^[A-Za-z0-9-]*$/, "La placa solo admite letras, números y guiones")
    .nullable(),
  vehicle_type: z.enum(["car", "motorcycle", "taxi", "ev"]),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProfileUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const payload = {
      user_id: context.userId,
      full_name: data.full_name,
      city: data.city,
      plate: data.plate ? data.plate.toUpperCase() : null,
      vehicle_type: data.vehicle_type,
    };
    const { error } = await context.supabase
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SaveRouteSchema = z.object({
  origin_label: z.string().trim().min(1).max(160),
  destination_label: z.string().trim().min(1).max(160),
  origin_lat: z.number(),
  origin_lng: z.number(),
  destination_lat: z.number(),
  destination_lng: z.number(),
  distance_meters: z.number().int().nonnegative(),
  duration_seconds: z.number().int().nonnegative(),
});

export const saveRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveRouteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("route_history")
      .insert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listRouteHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RouteHistoryItem[]> => {
    const { data, error } = await context.supabase
      .from("route_history")
      .select("id, origin_label, destination_label, distance_meters, duration_seconds, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as RouteHistoryItem[];
  });

export const deleteRouteHistoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("route_history")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
