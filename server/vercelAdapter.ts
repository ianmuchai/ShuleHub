import { Application } from "express";
import { IncomingMessage, ServerResponse } from "node:http";

type VercelRequest = IncomingMessage & { query?: Record<string, unknown> };

const first = (value: unknown) => Array.isArray(value) ? value[0] : value;

const normalizedPathFromQuery = (query: Record<string, unknown>) => {
  const rawPath = first(query.path);
  if (!rawPath) return "/api/health";
  const path = String(rawPath).replace(/^\/+/, "");
  return `/api/${path}`;
};

const queryWithoutRoutingPath = (query: Record<string, unknown>) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key === "path") continue;
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (item !== undefined) params.append(key, String(item));
    }
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
};

const withParams = (targetPath: string, query: Record<string, unknown>) => {
  return targetPath.replace(/:([A-Za-z0-9_]+)/g, (_match, key: string) => {
    const value = first(query[key]);
    return encodeURIComponent(String(value ?? ""));
  });
};

const withOriginalQuery = (targetPath: string, originalUrl?: string) => {
  const [, query = ""] = String(originalUrl ?? "").split("?");
  return query ? `${targetPath}?${query}` : targetPath;
};

export const vercelPathApp = (app: Application, targetPath: string) => {
  return (request: VercelRequest, response: ServerResponse) => {
    const resolvedPath = withParams(targetPath, request.query ?? {});
    request.url = withOriginalQuery(resolvedPath, request.url);
    return app(request, response);
  };
};

export const vercelApiApp = (app: Application) => {
  return (request: VercelRequest, response: ServerResponse) => {
    const query = request.query ?? Object.fromEntries(new URLSearchParams(String(request.url ?? "").split("?")[1] ?? ""));
    request.url = `${normalizedPathFromQuery(query)}${queryWithoutRoutingPath(query)}`;
    return app(request, response);
  };
};