import { parseApiResponse, type ApiPath } from "../shared/api.ts";

// Invalid-command tests inspect status without parsing an error as success data.
export async function httpResult<P extends ApiPath>(
  path: P,
  response: Response,
) {
  const input: unknown = await response.json();
  return { status: response.status, data: () => parseApiResponse(path, input) };
}
