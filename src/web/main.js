// Einstieg für Textline im Browser: erst die Browser-Brücke (window.api), dann dieselbe Oberfläche wie am PC.
import './api.js';
import '../renderer/js/app.js';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
  // Beim allerersten Besuch läuft die Seite noch ohne Service Worker und ist damit nicht "cross-origin isolated"
  // (braucht Python für input() und Stopp) - sobald er übernimmt, einmal neu laden. Die Sitzung ist dann schon gesichert.
  if (!window.crossOriginIsolated) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      try {
        if (sessionStorage.getItem('textline-isolated')) return;
        sessionStorage.setItem('textline-isolated', '1');
      } catch {
        return;
      }
      location.reload();
    });
  }
}
