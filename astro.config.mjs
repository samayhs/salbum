import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://salbum.example',
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
