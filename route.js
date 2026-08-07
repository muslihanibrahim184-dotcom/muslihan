@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --paper: #F4F4F5;
  --ink: #131417;
}

html, body {
  background: var(--paper);
  overscroll-behavior-y: contain;
}
body {
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  letter-spacing: -0.011em;
}
* { -webkit-tap-highlight-color: transparent; }
input, select, button, textarea { font-family: inherit; }

/* Rafine seçim & odak */
::selection { background: #131417; color: #fff; }
button, a, input, select, textarea { transition: background-color .18s ease, border-color .18s ease, color .18s ease, box-shadow .18s ease, transform .18s ease; }
:focus-visible { outline: 2px solid #4338CA; outline-offset: 2px; border-radius: 8px; }

/* İnce, modern kaydırma çubuğu */
* { scrollbar-width: thin; scrollbar-color: #C9CACE transparent; }
*::-webkit-scrollbar { width: 9px; height: 9px; }
*::-webkit-scrollbar-thumb { background: #CBCCD1; border-radius: 999px; border: 2px solid transparent; background-clip: content-box; }
*::-webkit-scrollbar-thumb:hover { background: #A9AAB0; background-clip: content-box; }
*::-webkit-scrollbar-track { background: transparent; }

/* Premium kart gölgesi yardımcıları */
.kart-golge { box-shadow: 0 1px 2px rgba(17,19,23,.04), 0 8px 24px -12px rgba(17,19,23,.10); }
.kart-golge-hover:hover { box-shadow: 0 2px 4px rgba(17,19,23,.05), 0 18px 40px -16px rgba(17,19,23,.18); }
