const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api").replace(/\/$/, "");

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | null;
};

export async function apiFetch<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
    body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : (options.body as BodyInit | null | undefined)
  });

  const responseText = await response.text();
  const payload = responseText
    ? (() => {
        try {
          return JSON.parse(responseText) as T & { message?: string };
        } catch {
          return { message: responseText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() } as T & { message?: string };
        }
      })()
    : ({} as T & { message?: string });

  if (!response.ok) {
    throw new Error(payload.message ?? "İşlem tamamlanamadı.");
  }

  return payload;
}
