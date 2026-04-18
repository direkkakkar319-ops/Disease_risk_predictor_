/**
 * Authenticated fetch wrapper.
 *
 * - Attaches the Bearer token from localStorage automatically.
 * - On a 401 response it attempts ONE silent token refresh via
 *   POST /auth/refresh, stores the new access_token, and retries
 *   the original request.
 * - If the refresh also fails (refresh token expired / missing)
 *   it clears both tokens so the user lands back at the login screen.
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'https://medscan-api-x9ne.onrender.com';

async function tryRefresh() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) throw new Error('Refresh failed');
        const data = await res.json();
        localStorage.setItem('access_token', data.access_token);
        // Backend returns the same refresh_token; update if a new one is issued
        if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
        return true;
    } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        return false;
    }
}

/**
 * Fetch wrapper that handles auth automatically.
 *
 * @param {string} path      - e.g. '/api/reports'
 * @param {RequestInit} opts - standard fetch options (method, body, etc.)
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, opts = {}) {
    const token = localStorage.getItem('access_token');

    const headers = {
        ...(opts.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    let res = await fetch(`${API_BASE}${path}`, { ...opts, headers });

    // Silent token refresh on 401
    if (res.status === 401) {
        const refreshed = await tryRefresh();
        if (refreshed) {
            const newToken = localStorage.getItem('access_token');
            headers.Authorization = `Bearer ${newToken}`;
            res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
        }
    }

    return res;
}

/**
 * Convenience GET helper — returns parsed JSON or throws.
 */
export async function apiGet(path) {
    const res = await apiFetch(path);
    if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
    return res.json();
}
