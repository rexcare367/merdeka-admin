import * as jose from "jose"

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error("AUTH_SECRET is not set")
  }
  return new TextEncoder().encode(secret)
}

export type AccessTokenPayload = {
  sub: string
  email: string
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  const key = getSecretKey()
  return new jose.SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key)
}

export async function verifyAccessToken(
  token: string
): Promise<AccessTokenPayload | null> {
  try {
    const key = getSecretKey()
    const { payload } = await jose.jwtVerify(token, key)
    const sub = payload.sub
    const email = typeof payload.email === "string" ? payload.email : null
    if (typeof sub !== "string" || !email) {
      return null
    }
    return { sub, email }
  } catch {
    return null
  }
}
