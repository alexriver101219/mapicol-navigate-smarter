import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPicoCities, listPicoYPlaca } from "@/lib/pico.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ShieldAlert } from "lucide-react";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export const Route = createFileRoute("/_authenticated/pico-y-placa")({
  head: () => ({
    meta: [
      { title: "Pico y placa hoy en Colombia | MapiCol" },
      {
        name: "description",
        content:
          "Consulta el pico y placa de Bogotá, Medellín, Cali, Barranquilla y Bucaramanga según tu placa y tu vehículo.",
      },
      { property: "og:title", content: "Pico y placa hoy en Colombia | MapiCol" },
      {
        property: "og:description",
        content: "Restricciones vigentes por ciudad, día y dígito de placa.",
      },
    ],
  }),
  component: PicoPage,
});

function PicoPage() {
  const citiesFn = useServerFn(listPicoCities);
  const rulesFn = useServerFn(listPicoYPlaca);
  const profileFn = useServerFn(getMyProfile);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => profileFn({}) });
  const { data: cities } = useQuery({ queryKey: ["pico-cities"], queryFn: () => citiesFn({}) });
  const [city, setCity] = useState<string>("");

  useEffect(() => {
    if (city) return;
    const preferred = profile?.city;
    if (preferred && cities?.some((c) => c.toLowerCase() === preferred.toLowerCase())) {
      setCity(cities.find((c) => c.toLowerCase() === preferred.toLowerCase())!);
    } else if (cities?.length) {
      setCity(cities[0]!);
    }
  }, [cities, profile, city]);

  const { data: rules, isLoading } = useQuery({
    queryKey: ["pico", city],
    queryFn: () => rulesFn({ data: { city } }),
    enabled: Boolean(city),
  });

  const today = new Date().getDay();
  const lastDigit = profile?.plate?.replace(/[^0-9]/g, "").slice(-1) ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <ShieldAlert className="size-5 text-primary" />
        Pico y placa
      </h1>

      <div className="max-w-xs">
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger aria-label="Ciudad">
            <SelectValue placeholder="Elige tu ciudad" />
          </SelectTrigger>
          <SelectContent>
            {cities?.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {lastDigit && (
        <p className="text-sm text-muted-foreground">
          Tu placa <span className="font-medium text-foreground">{profile?.plate}</span> termina en{" "}
          {lastDigit}.
        </p>
      )}

      {isLoading && <Loader2 className="size-5 animate-spin text-primary" />}

      {rules?.map((rule) => {
        const restrictedToday =
          rule.weekday === today && Boolean(lastDigit) && rule.digits.includes(lastDigit!);
        return (
          <Card key={rule.id} className={restrictedToday ? "border-destructive" : undefined}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span>{DAYS[rule.weekday]}</span>
                {rule.weekday === today && (
                  <Badge variant={restrictedToday ? "destructive" : "secondary"}>
                    {restrictedToday ? "Hoy no puedes circular" : "Hoy"}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p>
                Dígitos: <span className="font-medium text-foreground">{rule.digits}</span>
              </p>
              <p>Horario: {rule.schedule}</p>
              <p>Vehículo: {VEHICLE_LABELS[rule.vehicle_type] ?? rule.vehicle_type}</p>
              {rule.notes && rule.notes !== DAYS[rule.weekday] && (
                <p className="text-xs">{rule.notes}</p>
              )}

            </CardContent>
          </Card>
        );
      })}

      <p className="text-xs text-muted-foreground">
        Información de referencia. Verifica siempre los decretos vigentes de tu ciudad.
      </p>
    </div>
  );
}
