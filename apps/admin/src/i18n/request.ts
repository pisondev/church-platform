import { getRequestConfig } from "next-intl/server";

import { defaultLocale } from "./config";

// Single locale for now. Resolve it from the request once more are added.
export default getRequestConfig(async () => {
  const locale = defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
