import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRouteHistory, deleteRouteHistoryItem } from "@/lib/profile.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, History } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/historial")({
  head: () => ({
    meta: [
      { title: "Historial de rutas | MapiCol" },
      {
        name: "description",
        content: "Consulta tus rutas recientes en MapiCol con distancia y tiempo de viaje.",
      },
      { property: "og:title", content: "Historial de rutas | MapiCol" },
      {
        property: "og:description",
        content: "Todas tus rutas recientes guardadas en tu cuenta MapiCol.",
      },
    ],
  }),
  component: HistorialPage,
});

function HistorialPage() {
  const listFn = useServerFn(listRouteHistory);
  const deleteFn = useServerFn(deleteRouteHistoryItem);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["route-history"],
    queryFn: () => listFn({}),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["route-history"] }),
    onError: () => toast.error("No pudimos borrar el registro."),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <History className="size-5 text-primary" />
        Historial de rutas
      </h1>

      {isLoading && <Loader2 className="size-5 animate-spin text-primary" />}

      {!isLoading && (data?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground">
          Aún no tienes viajes guardados. Calcula una ruta desde el mapa y aparecerá aquí.
        </p>
      )}

      {data?.map((item) => (
        <Card key={item.id} className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate font-medium">{item.destination_label}</p>
            <p className="truncate text-xs text-muted-foreground">Desde {item.origin_label}</p>
            <p className="pt-1 text-xs text-muted-foreground">
              {item.distance_meters ? `${(item.distance_meters / 1000).toFixed(1)} km` : "—"} ·{" "}
              {item.duration_seconds ? `${Math.round(item.duration_seconds / 60)} min` : "—"} ·{" "}
              {new Date(item.created_at).toLocaleDateString("es-CO")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Eliminar ruta"
            onClick={() => remove.mutate(item.id)}
            disabled={remove.isPending}
          >
            <Trash2 className="size-4" />
          </Button>
        </Card>
      ))}
    </div>
  );
}
