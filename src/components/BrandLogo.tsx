import logoAsset from "@/assets/mapicol-logo.png.asset.json";

export function BrandLogo({ className = "h-9" }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="MapiCol — Navega por Colombia"
      className={`w-auto object-contain ${className}`}
    />
  );
}
