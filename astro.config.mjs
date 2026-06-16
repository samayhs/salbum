import { defineConfig } from 'astro/config';

import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: 'https://salbum.example',

  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },

  output: "hybrid",
  adapter: cloudflare()
});