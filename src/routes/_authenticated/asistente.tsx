import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { askAssistant, type AssistantAnswer } from "@/lib/assistant.functions";
import { getMyProfile } from "@/lib/profile.functions";
import { VoiceInput } from "@/components/VoiceInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Sparkles, Crown } from "lucide-react";

const BOGOTA = { lat: 4.711, lng: -74.0721 };

const SUGGESTIONS = [
  "Busca un parqueadero seguro cerca",
  "Recomiéndame un restaurante bien calificado",
  "¿Dónde cargo mi carro eléctrico?",
  "Necesito una gasolinera abierta ahora",
];

export const Route = createFileRoute("/_authenticated/asistente")({
  head: () => ({
    meta: [
      { title: "Asistente de IA por voz | MapiCol Pro" },
      {
        name: "description",
        content:
          "Pide por voz restaurantes, parqueaderos, centros comerciales y estaciones de carga con el asistente de IA de MapiCol Pro.",
      },
      { property: "og:title", content: "Asistente de IA por voz | MapiCol Pro" },
      {
        property: "og:description",
        content: "El asistente de MapiCol Pro busca y recomienda lugares por comando de voz.",
      },
    ],
  }),
  component: AsistentePage,
});

function AsistentePage() {
  const [position, setPosition] = useState(BOGOTA);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null);

  const profileFn = useServerFn(getMyProfile);
  const ask = useServerFn(askAssistant);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => profileFn({}) });
  const isPro = profile?.plan === "pro";

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => undefined,
    );
  }, []);

  const mutation = useMutation({
    mutationFn: (text: string) =>
      ask({ data: { prompt: text, lat: position.lat, lng: position.lng } }),
    onSuccess: setAnswer,
    onError: (error: Error) => toast.error(error.message || "El asistente no está disponible."),
  });

  function submit(text: string) {
    const clean = text.trim();
    if (clean.length < 2) return;
    setPrompt(clean);
    mutation.mutate(clean);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <h1 className="text-2xl font-bold">Asistente MapiCol</h1>
          <Badge variant={isPro ? "default" : "secondary"}>{isPro ? "Pro activo" : "Pro"}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Habla o escribe: el asistente busca restaurantes, parqueaderos, centros comerciales,
          gasolineras y puntos de carga cerca de ti, y te recomienda según valoraciones.
        </p>
      </header>

      {!isPro && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="size-4 text-primary" />
              Disponible en MapiCol Pro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              La navegación, el tráfico en vivo y el pico y placa son gratis. El asistente de IA
              hace parte del plan Pro por $30.000 COP al mes.
            </p>
            <Button asChild>
              <Link to="/precios">Ver plan Pro</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(prompt);
        }}
        className="flex gap-2"
      >
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ej: un café tranquilo con parqueadero"
          maxLength={400}
          disabled={!isPro}
          aria-label="Pregunta al asistente"
        />
        <VoiceInput size="icon" onTranscript={submit} />
        <Button type="submit" disabled={!isPro || mutation.isPending}>
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Preguntar"}
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <Button
            key={suggestion}
            variant="outline"
            size="sm"
            disabled={!isPro}
            onClick={() => submit(suggestion)}
          >
            {suggestion}
          </Button>
        ))}
      </div>

      {answer && (
        <section className="space-y-3">
          <Card>
            <CardContent className="pt-6 text-sm leading-relaxed">{answer.reply}</CardContent>
          </Card>
          {answer.places.map((place) => (
            <Card key={place.id} className="p-4">
              <p className="font-medium">{place.name}</p>
              <p className="text-xs text-muted-foreground">{place.address}</p>
              <p className="pt-1 text-xs text-muted-foreground">
                {place.rating ? `★ ${place.rating} (${place.userRatingCount ?? 0} reseñas)` : "Sin reseñas"}
                {place.openNow === true ? " · Abierto" : place.openNow === false ? " · Cerrado" : ""}
              </p>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
