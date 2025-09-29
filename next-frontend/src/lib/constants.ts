export const BACKEND_BASE_URL =
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:3000';

export const DASHBOARD_REFRESH = parseInt(
    process.env.NEXT_PUBLIC_DASHBOARD_REFRESH || '5000',
    10
);