const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

function credentials() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !connectionKey) {
    throw new Error("El servicio de mapas no está configurado.");
  }
  return { lovableKey, connectionKey };
}

async function handleFailure(response: Response): Promise<never> {
  const body = await response.text();
  if (response.status === 403) {
    console.error(`Google Maps 403: ${body}`);
    throw new Error(
      "Google Maps rechazó la solicitud (403). Revisa las restricciones de la llave del servicio.",
    );
  }
  console.error(`Google Maps error [${response.status}]: ${body}`);
  throw new Error(`No se pudo consultar el servicio de mapas (${response.status}).`);
}

export async function mapsGet<T>(path: string): Promise<T> {
  const { lovableKey, connectionKey } = credentials();
  const response = await fetch(`${GATEWAY_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
    },
  });
  if (!response.ok) await handleFailure(response);
  return (await response.json()) as T;
}

export async function mapsPost<T>(
  path: string,
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<T> {
  const { lovableKey, connectionKey } = credentials();
  const response = await fetch(`${GATEWAY_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) await handleFailure(response);
  return (await response.json()) as T;
}
