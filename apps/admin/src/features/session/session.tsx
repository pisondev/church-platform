"use client";

import { createContext, useContext } from "react";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  isSuperAdmin: boolean;
};

export type Church = { id: string; name: string; slug: string };

// What GET /api/v1/auth/me returns for a signed-in user.
export type Session = { user: SessionUser; churches: Church[] };

export type SessionValue = { session: Session; signOut: () => void };

export const SessionContext = createContext<SessionValue | null>(null);

// The signed-in user. Only available below SessionGate.
export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used below SessionGate");
  return value;
}

// A name to show: the profile name, or the part of the email before the @.
export function displayName(user: SessionUser): string {
  return user.name || user.email.split("@")[0];
}
