const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "https://cateringhizmet.com.tr/backend/api").replace(/\/$/, "");

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
    credentials: "include",
    headers,
    body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : (options.body as BodyInit | null | undefined)
  });

  const responseText = await response.text();
  let payload = {} as T & { message?: string };

  if (responseText) {
    try {
      payload = JSON.parse(responseText) as T & { message?: string };
    } catch {
      throw new Error("Backend JSON yerine sayfa dondurdu. API adresini kontrol et.");
    }
  }

  if (!response.ok) {
    throw new Error(payload.message ?? "İşlem tamamlanamadı.");
  }

  return payload;
}
