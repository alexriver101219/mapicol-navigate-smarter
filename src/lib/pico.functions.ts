import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type PicoRule = {
  id: string;
  city: string;
  weekday: number;
  digits: string;
  schedule: string;
  vehicle_type: string;
  notes: string | null;
};

export const listPicoYPlaca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ city: z.string().trim().min(2).max(60) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<PicoRule[]> => {
    const { data: rows, error } = await context.supabase
      .from("pico_y_placa")
      .select("id, city, weekday, digits, schedule, vehicle_type, notes")
      .ilike("city", data.city)
      .order("weekday", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as PicoRule[];
  });

export const listPicoCities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<string[]> => {
    const { data, error } = await context.supabase
      .from("pico_y_placa")
      .select("city")
      .order("city", { ascending: true });
    if (error) throw new Error(error.message);
    return [...new Set((data ?? []).map((r) => (r as { city: string }).city))];
  });
