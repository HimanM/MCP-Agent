const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://127.0.0.1:8000";

export function backendUrl(path: string) {
  return `${BACKEND_API_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
