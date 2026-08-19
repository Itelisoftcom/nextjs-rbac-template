import { createAuthClient } from "better-auth/react";

// Sin baseURL: el cliente usa el origin actual (mismo Next.js app sirve la API de auth).
export const authClient = createAuthClient();
