// src/lib/auth.js
// ─────────────────────────────────────────────────────────────────
// Drop-in replacement for supabase.auth.* calls.
// All auth now goes through your FastAPI backend.
// ─────────────────────────────────────────────────────────────────

import { supabase } from "./supabase";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Token storage (localStorage) ─────────────────────────────────
const KEYS = {
    access: "docchat_access_token",
    refresh: "docchat_refresh_token",
    user: "docchat_user",
    expiry: "docchat_token_expiry",
};

export function saveSession({ access_token, refresh_token, expires_in, user }) {
    localStorage.setItem(KEYS.access, access_token);
    localStorage.setItem(KEYS.refresh, refresh_token);
    localStorage.setItem(KEYS.user, JSON.stringify(user));
    // store absolute expiry timestamp (ms)
    const expiresAt = Date.now() + (expires_in ?? 3600) * 1000;
    localStorage.setItem(KEYS.expiry, String(expiresAt));

    // ✅ Update Supabase client session for database operations
    updateSupabaseSession(access_token, refresh_token);
}

export function clearSession() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    // ✅ Clear Supabase session
    supabase.auth.signOut();
}

export function getStoredUser() {
    try { return JSON.parse(localStorage.getItem(KEYS.user) || "null"); }
    catch { return null; }
}

export function getAccessToken() {
    return localStorage.getItem(KEYS.access);
}

function isTokenExpired() {
    const expiry = localStorage.getItem(KEYS.expiry);
    if (!expiry) return true;
    // treat as expired 30s before actual expiry to avoid edge cases
    return Date.now() > Number(expiry) - 30_000;
}

// ── Update Supabase client session ────────────────────────────────
export function updateSupabaseSession(access_token, refresh_token) {
    if (!access_token || !refresh_token) return;

    // Set the session in Supabase client so database operations work
    supabase.auth.setSession({
        access_token,
        refresh_token,
    });
}

// ── Token refresh ─────────────────────────────────────────────────
async function refreshAccessToken() {
    const refresh_token = localStorage.getItem(KEYS.refresh);
    if (!refresh_token) { clearSession(); return null; }

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token }),
    });

    if (!res.ok) { clearSession(); return null; }

    const data = await res.json();
    localStorage.setItem(KEYS.access, data.access_token);
    localStorage.setItem(KEYS.refresh, data.refresh_token);
    localStorage.setItem(KEYS.expiry, String(Date.now() + (data.expires_in ?? 3600) * 1000));

    // ✅ Update Supabase session with new tokens
    updateSupabaseSession(data.access_token, data.refresh_token);

    return data.access_token;
}

// ── Get a valid token (auto-refresh if expired) ───────────────────
export async function getValidToken() {
    if (isTokenExpired()) {
        return await refreshAccessToken();
    }
    return getAccessToken();
}

// ── Authenticated fetch — use this for ALL API calls ─────────────
export async function authFetch(path, options = {}) {
    const token = await getValidToken();
    if (!token) throw new Error("Not authenticated. Please log in.");

    const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;

    return fetch(url, {
        ...options,
        headers: {
            ...(options.headers ?? {}),
            Authorization: `Bearer ${token}`,
        },
    });
}

// ═════════════════════════════════════════════════════════════════
// Auth actions — call these instead of supabase.auth.*
// ═════════════════════════════════════════════════════════════════

/**
 * Sign up a new user.
 * Returns { user } on success, throws on error.
 */
export async function signUp({ email, password, fullName = "" }) {
    const res = await fetch(`${BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Signup failed");

    // If Supabase email confirmation is disabled, we get tokens immediately
    if (data.access_token) {
        saveSession(data);
    }

    return { message: data.message, user: { email } };
}

/**
 * Sign in with email + password.
 * Returns { user } on success, throws on error.
 * Automatically saves tokens to localStorage.
 */
export async function signIn({ email, password }) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Login failed");

    saveSession(data);
    return { user: data.user };
}

/**
 * Sign out. Revokes token on backend and clears localStorage.
 */
export async function signOut() {
    try {
        await authFetch("/auth/logout", { method: "POST" });
    } catch {
        // still clear locally even if backend call fails
    } finally {
        clearSession();
    }
}

/**
 * Get current logged-in user.
 * Returns stored user object or null if not logged in.
 */
export function getCurrentUser() {
    return getStoredUser();
}

/**
 * Check if user is authenticated (has a non-expired token).
 */
export async function isAuthenticated() {
    const token = await getValidToken();
    return !!token;
}

/**
 * Initialize Supabase session from stored tokens.
 * Call this on app mount to restore the session.
 */
export function initializeSupabaseSession() {
    const access_token = getAccessToken();
    const refresh_token = localStorage.getItem(KEYS.refresh);

    if (access_token && refresh_token) {
        updateSupabaseSession(access_token, refresh_token);
    }
}
