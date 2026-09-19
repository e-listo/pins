const DEFAULT_PINS_API_URL = "https://api-pins.dpupkp.my.id/api/v1";

export const PINS_API_URL = (
  process.env.NEXT_PUBLIC_PINS_API_URL || DEFAULT_PINS_API_URL
).replace(/\/$/, "");

export type PinsApiHealth = {
  status: string;
  service: string;
};

export async function getPinsApiHealth(
  signal?: AbortSignal,
): Promise<PinsApiHealth> {
  const response = await fetch(`${PINS_API_URL}/health`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`PINS API health check gagal (${response.status})`);
  }

  return response.json();
}
