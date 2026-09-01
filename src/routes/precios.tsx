import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown } from "lucide-react";

export const Route = createFileRoute("/precios")({
  head: () => ({
    meta: [
      { title: "Planes y precios de MapiCol | Gratis y Pro" },
      {
        name: "description",
        content:
          "MapiCol gratis incluye navegación, tráfico en vivo, voz y pico y placa. MapiCol Pro añade asistente de IA por $30.000 COP al mes.",
      },
      { property: "og:title", content: "Planes y precios de MapiCol" },
      {
        property: "og:description",
        content: "Navegación gratuita en Colombia y asistente de IA en el plan Pro.",
      },
    ],
  }),
  component: PreciosPage,
});

const FREE = [
  "Navegación paso a paso en Colombia y el mundo",
  "Tráfico en tiempo real y rutas alternas",
  "Comandos por voz en español",
  "Pico y placa por ciudad y placa",
  "Historial de rutas y lugares guardados",
];

const PRO = [
  "Todo lo del plan gratis",
  "Asistente de IA por voz dentro del mapa",
  "Búsqueda de restaurantes y centros comerciales",
  "Parqueaderos, gasolineras y carga eléctrica",
  "Recomendaciones según valoraciones y necesidades",
];

function PreciosPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flag-bar h-1 w-full" />
      <header className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <Link to="/">
          <BrandLogo className="h-9" />
        </Link>
        <Button asChild variant="outline">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <section className="py-8 text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">Planes de MapiCol</h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Navega gratis siempre. Suma inteligencia artificial cuando quieras que MapiCol busque y
            recomiende por ti. Pagas en pesos colombianos o en tu moneda local.
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>MapiCol Gratis</CardTitle>
              <CardDescription>Todo lo esencial para moverte por la ciudad.</CardDescription>
              <p className="pt-2 text-3xl font-bold">$0</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm">
                {FREE.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="w-full">
                <Link to="/auth">Crear cuenta gratis</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary shadow-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Crown className="size-5 text-primary" />
                  MapiCol Pro
                </CardTitle>
                <Badge>Recomendado</Badge>
              </div>
              <CardDescription>Asistente de IA por voz dentro del mapa.</CardDescription>
              <p className="pt-2 text-3xl font-bold">
                $30.000 <span className="text-base font-normal text-muted-foreground">COP/mes</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Fuera de Colombia se cobra el equivalente en tu moneda local.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm">
                {PRO.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full">
                <Link to="/auth">Empezar con Pro</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
