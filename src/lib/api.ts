// Tiny JSON client for the BridgeUni API. The session lives in an httpOnly cookie.

export type User = { id: string; identifier: string; kind: "email" | "phone"; name: string; createdAt: string };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly field?: string,
    readonly code?: string,
    readonly data?: unknown,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? "GET",
      credentials: "same-origin",
      headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError("You seem to be offline. Check your connection and try again.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      typeof data.error === "string" ? data.error : "Something went wrong. Please try again.",
      res.status,
      data.field,
      data.code,
      data.data,
    );
  }
  return data as T;
}
