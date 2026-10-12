import { NextResponse } from "next/server";
import { AuthenticationError, PasswordChangeRequiredError, ResourceNotFoundError } from "@/lib/auth/guards";
import { AuthorizationError } from "@/lib/rbac/policy";

export function apiError(error: unknown): NextResponse {
  if (error instanceof AuthenticationError) {
    return NextResponse.json({ error: "Autenticación requerida." }, { status: 401 });
  }
  if (error instanceof AuthorizationError) {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  }
  if (error instanceof PasswordChangeRequiredError) {
    return NextResponse.json({ error: "Actualiza tu contraseña para continuar." }, { status: 403 });
  }
  if (error instanceof ResourceNotFoundError) {
    return NextResponse.json({ error: "Recurso no encontrado." }, { status: 404 });
  }
  return NextResponse.json({ error: "No se pudo procesar la solicitud." }, { status: 500 });
}

export function invalidInput(): NextResponse {
  return NextResponse.json({ error: "Los datos enviados no son válidos." }, { status: 400 });
}
