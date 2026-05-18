const BASE_URL = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000"
).replace(/\/$/, "");

type ApiError = {
  code: string;
  message: string;
};

type ApiResponse<T> = {
  data: T | null;
  error: ApiError | null;
};

export const post = async <T>(endpoint: string, body?: unknown): Promise<T> => {
  const response = await fetch(`${BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = (await response.json()) as ApiResponse<T>;

  if (!response.ok || json.error) {
    throw new Error(json.error?.message ?? "Request failed");
  }

  if (json.data === null) {
    throw new Error("Missing response data");
  }

  return json.data;
};

export const get = async <T>(endpoint: string): Promise<T> => {
  const response = await fetch(`${BASE_URL}/${endpoint}`);
  return response.json();
};
