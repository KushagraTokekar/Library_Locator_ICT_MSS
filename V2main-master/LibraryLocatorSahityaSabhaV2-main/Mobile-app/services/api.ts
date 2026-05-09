import { jwtDecode } from "jwt-decode";

import { API_BASE } from "../constants/api";
import { getAuthToken, removeAuthToken } from "./authStorage";

type JwtPayload = {
  exp?: number;
};

const AUTH_ENDPOINTS = [
  "/login",
  "/signup",
  "/verify-email",
  "/resend-otp",
  "/forgot-password",
  "/reset-password",
  "/change-password",
  "/delete-account"
] as const;

function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwtDecode<JwtPayload>(token);

    if (!decoded.exp) return false;

    return decoded.exp < Date.now() / 1000;
  } catch {
    return true;
  }
}

function isAuthEndpoint(endpoint: string): boolean {
  return AUTH_ENDPOINTS.some((prefix) => endpoint.startsWith(prefix));
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  try {
    const token = await getAuthToken();

    if (token && isTokenExpired(token)) {
      await removeAuthToken();
      throw new Error("SESSION_EXPIRED");
    }

    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const url = `${API_BASE}${endpoint}`;
    console.log("FULL URL =", url);

    const response = await fetch(url, {
      ...options,
      headers
    });

    console.log("STATUS =", response.status);

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    console.log("DATA =", data);

    if (response.status === 401 && !isAuthEndpoint(endpoint)) {
      await removeAuthToken();
      throw new Error("UNAUTHORIZED");
    }

    return {
      ok: response.ok,
      status: response.status,
      data
    };
  } catch (error: any) {
    console.log("API ERROR =", error?.message || String(error));

    if (
      error?.message === "SESSION_EXPIRED" ||
      error?.message === "UNAUTHORIZED"
    ) {
      throw error;
    }

    throw new Error("NETWORK_ERROR");
  }
}
