"use client";

import { authClient } from "@/lib/auth-client";
import type { Role } from "@/types/auth";

export function useCurrentUser() {
  const { data, isPending } = authClient.useSession();
  const user = data?.user
    ? { id: data.user.id, name: data.user.name, email: data.user.email, role: data.user.role as Role }
    : null;
  return { user, isPending };
}
