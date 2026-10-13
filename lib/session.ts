import { SignJWT, jwtVerify } from "jose";

const secretKey = process.env.SESSION_SECRET;

if (!secretKey) {
  throw new Error("SESSION_SECRET is not defined.");
}

const encodedKey = new TextEncoder().encode(secretKey);

export async function createSession(userId: string, role: string) {
  return new SignJWT({
    userId,
    role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, encodedKey);

    return {
      userId: payload.userId as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}