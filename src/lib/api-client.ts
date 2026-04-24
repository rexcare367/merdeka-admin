"use client"

import axios from "axios"
import { signOut } from "next-auth/react"

function getAccessToken(): string | null {
  try {
    return sessionStorage.getItem("adminAccessToken")
  } catch {
    return null
  }
}

async function doClientLogout() {
  try {
    sessionStorage.removeItem("adminAccessToken")
  } catch {
    /* ignore */
  }

  await signOut({ redirectTo: "/auth/login" })
}

export const api = axios.create({
  headers: { "content-type": "application/json" },
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status
    if (status === 401) {
      await doClientLogout()
    }
    return Promise.reject(error)
  }
)

