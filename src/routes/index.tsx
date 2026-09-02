import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import heroImage from "@/assets/mapicol-hero.jpg";
import mockupsImage from "@/assets/mapicol-mockups.jpg";
import {
  Mic,
  TrafficCone,
  ShieldAlert,
  Sparkles,
  Navigation,
  History,
  Crown,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MapiCol — Navega por Colombia con tráfico en vivo y voz" },
      {
        name: "description",
        content:
          "MapiCol es la app de navegación colombiana: rutas con tráfico real, comandos por voz, pico y placa gratis y un asistente de IA en el plan Pro.",
      },
      { property: "og:title", content: "MapiCol — Navega por Colombia" },
      {
        property: "og:description",
        content:
          "Rutas con tráfico en vivo, comandos por voz, pico y placa y asistente de IA para restaurantes, parqueaderos y estaciones de carga.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Navigation,
    title: "Navegación intuitiva",
    text: "Rutas claras dentro y fuera de Colombia, con alternativas cuando la vía se congestiona.",
  },
  {
    icon: TrafficCone,
    title: "Tráfico en tiempo real",
    text: "Mira el estado real de las vías y elige la mejor ruta antes de salir.",
  },
  {
    icon: Mic,
    title: "Comandos por voz",
    text: "Habla en español y deja las manos en el timón: buscar, navegar y consultar.",
  },
  {
    icon: ShieldAlert,
    title: "Pico y placa",
    text: "Consulta la restricción de tu placa por ciudad, día y horario.",
  },
  {
    icon: History,
    title: "Historial de rutas",
    text: "Tus viajes quedan guardados en tu cuenta para repetirlos en un toque.",
  },
  {
    icon: Sparkles,
    title: "Asistente de IA (Pro)",
    text: "Pide restaurantes, parqueaderos, centros comerciales, gasolineras o carga eléctrica.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flag-bar h-1 w-full" />
      <header className="mx-auto flex max-w-6xl items-center justify-between p-4">
        <BrandLogo className="h-9" />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/precios">Precios</Link>
          </Button>
          <Button asChild>
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="hero-gradient">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
            <div className="space-y-6">
              <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                Navega por Colombia sin sorpresas en la vía
              </h1>
              <p className="text-lg text-muted-foreground">
                MapiCol combina tráfico en vivo, comandos por voz y pico y placa en una sola app
                gratuita. Con el plan Pro, un asistente de IA busca por ti lo que necesitas en el
                camino.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/auth">Crear cuenta gratis</Link>
                </Button>
                <Button asChild size="lg" variant="hero">
                  <Link to="/precios">Ver plan Pro</Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Registro obligatorio para guardar tus rutas y tu placa de forma segura.
              </p>
            </div>
            <img
              src={heroImage}
              alt="MapiCol mostrando una ruta con tráfico pesado y alertas de rutas alternas en un paisaje colombiano"
              className="w-full rounded-2xl shadow-elevated"
              loading="eager"
              width={1200}
              height={900}
            />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold">Todo lo que necesitas al volante</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <Card key={title}>
                <CardContent className="space-y-2 pt-6">
                  <Icon className="size-6 text-primary" />
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-secondary/40">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2">
            <img
              src={mockupsImage}
              alt="MapiCol funcionando en tablet, celular y computador con historial, navegación y tráfico en vivo"
              className="w-full rounded-2xl"
              loading="lazy"
              width={1200}
              height={800}
            />
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">En tu celular, tablet y computador</h2>
              <p className="text-muted-foreground">
                MapiCol se instala en tu pantalla de inicio como una app nativa y funciona igual en
                Android, iPhone y escritorio. Tu cuenta sincroniza rutas, lugares guardados y tu
                placa en todos los dispositivos.
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-4">
                <Crown className="size-5 text-primary" />
                <p className="text-sm">
                  Plan Pro con asistente de IA por{" "}
                  <span className="font-semibold">$30.000 COP al mes</span> o su equivalente en tu
                  moneda local.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-3xl font-bold">Empieza gratis hoy</h2>
          <p className="mt-3 text-muted-foreground">
            Crea tu cuenta, guarda tu placa y deja que MapiCol te lleve por la mejor ruta.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/auth">Crear mi cuenta</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        MapiCol · Navega por Colombia
      </footer>
    </div>
  );
}
