import { Application } from "express";
import { IncomingMessage, ServerResponse } from "node:http";

const withParams = (targetPath: string, query: Record<string, unknown>) => {
  return targetPath.replace(/:([A-Za-z0-9_]+)/g, (_match, key: string) => {
    const value = query[key];
    const firstValue = Array.isArray(value) ? value[0] : value;
    return encodeURIComponent(String(firstValue ?? ""));
  });
};

const withOriginalQuery = (targetPath: string, originalUrl?: string) => {
  const [, query = ""] = String(originalUrl ?? "").split("?");
  return query ? `${targetPath}?${query}` : targetPath;
};

export const vercelPathApp = (app: Application, targetPath: string) => {
  return (request: IncomingMessage & { query?: Record<string, unknown> }, response: ServerResponse) => {
    const resolvedPath = withParams(targetPath, request.query ?? {});
    request.url = withOriginalQuery(resolvedPath, request.url);
    return app(request, response);
  };
};