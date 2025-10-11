// Prefer NEXT_PUBLIC_BACKEND_URL (used in docker-compose),
// fall back to NEXT_PUBLIC_BACKEND_BASE_URL, then localhost
export const BACKEND_BASE_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
    'http://localhost:3000';

// WebSocket base URL mirrors backend URL unless explicitly set
export const WS_BASE_URL =
    process.env.NEXT_PUBLIC_WS_URL || BACKEND_BASE_URL;

export const DASHBOARD_REFRESH = parseInt(
    process.env.NEXT_PUBLIC_DASHBOARD_REFRESH || '5000',
    10
);