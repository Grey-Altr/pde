import { createSerwistRoute } from "@serwist/turbopack";

export const { GET } = createSerwistRoute({
  swSrc: "app/sw.ts",
  additionalPrecacheEntries: [
    { url: "/", revision: null },
    { url: "/sign-in", revision: null },
  ],
});
