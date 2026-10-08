import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";

import { type Session, SessionContext } from "@/features/session/session";

import messages from "../messages/en.json";

// Renders a component with the English messages, as the root layout does.
export function renderWithMessages(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

export const testSession: Session = {
  user: {
    id: "user-1",
    email: "admin@example.com",
    name: "Admin Person",
    avatarUrl: "",
    isSuperAdmin: true,
  },
  churches: [{ id: "church-1", name: "GKJ Sentolo", slug: "gkj-sentolo" }],
};

// Renders a component as a signed-in user would see it.
export function renderWithSession(ui: ReactElement, session: Session = testSession, signOut = () => {}) {
  return renderWithMessages(<SessionContext value={{ session, signOut }}>{ui}</SessionContext>);
}

export { messages };
