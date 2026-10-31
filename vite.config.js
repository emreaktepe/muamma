import { defineConfig } from 'vite';

// GitHub Pages'te /muamma/ altında da, yerelde kökte de çalışsın diye göreli yol.
export default defineConfig({
  base: './',
  test: { environment: 'node' },
});
