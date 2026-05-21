const BASE_URL = process.env.API_BASE_URL;

type ApiError = {
  code: string;
  message: string;
};

type ApiResponse<T> = {
  data: T | null;
  error: ApiError | null;
};

export type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Request failed";
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  let json: ApiResponse<T>;

  try {
    json = (await response.json()) as ApiResponse<T>;
  } catch {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    throw new Error("Invalid API response");
  }

  if (!response.ok || json.error) {
    throw new Error(json.error?.message ?? "Request failed");
  }

  if (json.data === null) {
    throw new Error("Missing response data");
  }

  return json.data;
};

// A simple wrapper around fetch for GET requests that returns the parsed JSON data or throws an error
export const get = async <T>(endpoint: string): Promise<T> => {
  try {
    const response = await fetch(`${BASE_URL}/${endpoint}`);
    return await parseResponse<T>(response);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// A safe version of get that returns an ApiResult instead of throwing errors
export const safeGet = async <T>(endpoint: string): Promise<ApiResult<T>> => {
  try {
    return {
      data: await get<T>(endpoint),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: getErrorMessage(error),
    };
  }
};

// A simple wrapper around fetch for PATCH requests that returns the parsed JSON data or throws an error
export const patch = async <T>(
  endpoint: string,
  body?: unknown,
): Promise<T> => {
  try {
    const response = await fetch(`${BASE_URL}/${endpoint}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

    return await parseResponse<T>(response);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

// A safe version of patch that returns an ApiResult instead of throwing errors
export const safePatch = async <T>(
  endpoint: string,
  body?: unknown,
): Promise<ApiResult<T>> => {
  try {
    return {
      data: await patch<T>(endpoint, body),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: getErrorMessage(error),
    };
  }
};
