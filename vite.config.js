import { defineConfig } from 'vite';

// GitHub Pages'te /muamma/ altında da, yerelde kökte de çalışsın diye göreli yol.
export default defineConfig({
  base: './',
  // three ayrı (tembel yüklenen) chunk'ta ~580 KB / ~150 KB gzip; 2D yolunda yüklenmez.
  build: { chunkSizeWarningLimit: 700 },
  test: { environment: 'node' },
});
