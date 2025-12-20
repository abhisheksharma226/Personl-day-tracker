// src/config/api.ts

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

export const API_ENDPOINTS = {
  signup: `${API_BASE_URL}/api/auth/signup`,
  login: `${API_BASE_URL}/api/auth/login`,
  tasks: `${API_BASE_URL}/api/tasks`,
}
