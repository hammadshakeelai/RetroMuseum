// The base path follows the repository name: /WebOS/ before the rename, /RetroMuseum/ after it.
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://hammadshakeelai.github.io",
  base: process.env.BASE_PATH ?? "/RetroMuseum/",
  trailingSlash: "always",
});
