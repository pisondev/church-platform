import type { ReactNode } from "react";

// Text between asterisks is set in italics, for words in another language:
// "dimatikan atau *silent*". An asterisk without a partner stays as it is.
export function emphasize(text: string): ReactNode[] {
  return text.split(/\*([^*]+)\*/).map((part, index) =>
    index % 2 === 1 ? (
      <em key={index} className="italic">
        {part}
      </em>
    ) : (
      part
    ),
  );
}
