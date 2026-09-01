import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Mi perfil y vehículo | MapiCol" },
      {
        name: "description",
        content:
          "Configura tu nombre, ciudad, placa y tipo de vehículo para recibir alertas de pico y placa en MapiCol.",
      },
      { property: "og:title", content: "Mi perfil y vehículo | MapiCol" },
      {
        property: "og:description",
        content: "Personaliza tu cuenta MapiCol y tu vehículo.",
      },
    ],
  }),
  component: PerfilPage,
});

const VEHICLES = [
  { value: "car", label: "Carro" },
  { value: "motorcycle", label: "Moto" },
  { value: "taxi", label: "Taxi" },
  { value: "ev", label: "Eléctrico" },
] as const;

function PerfilPage() {
  const profileFn = useServerFn(getMyProfile);
  const updateFn = useServerFn(updateMyProfile);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["profile"], queryFn: () => profileFn({}) });

  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [plate, setPlate] = useState("");
  const [vehicleType, setVehicleType] = useState<string>("car");

  useEffect(() => {
    if (!data) return;
    setFullName(data.full_name ?? "");
    setCity(data.city ?? "");
    setPlate(data.plate ?? "");
    setVehicleType(data.vehicle_type ?? "car");
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          full_name: fullName.trim() || null,
          city: city.trim() || null,
          plate: plate.trim() || null,
          vehicle_type: vehicleType as "car" | "motorcycle" | "taxi" | "ev",
        },
      }),
    onSuccess: () => {
      toast.success("Perfil actualizado");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Revisa los datos: la placa solo admite letras y números."),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Mi perfil</CardTitle>
            <Badge variant={data?.plan === "pro" ? "default" : "secondary"}>
              {data?.plan === "pro" ? "MapiCol Pro" : "Plan gratis"}
            </Badge>
          </div>
          <CardDescription>
            Guardamos tu placa para avisarte del pico y placa en tu ciudad.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <Loader2 className="size-5 animate-spin text-primary" />}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Ciudad</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={60}
              placeholder="Bogotá"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plate">Placa</Label>
              <Input
                id="plate"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                maxLength={10}
                placeholder="ABC123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle">Vehículo</Label>
              <Select value={vehicleType} onValueChange={setVehicleType}>
                <SelectTrigger id="vehicle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLES.map((vehicle) => (
                    <SelectItem key={vehicle.value} value={vehicle.value}>
                      {vehicle.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Guardar cambios
          </Button>
        </CardContent>
      </Card>

      {data?.plan !== "pro" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mejora a MapiCol Pro</CardTitle>
            <CardDescription>
              Asistente de IA por voz para restaurantes, parqueaderos, centros comerciales,
              gasolineras y puntos de carga. $30.000 COP al mes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/precios">Ver planes</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
