# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.



YueBeat AI language translation integration

Files:
- App.jsx: copy to client/src/App.jsx
- translation-styles.css: append its contents to the end of client/src/App.css
- server.js: copy to server/server.js (music and project routes preserved)
- project.js: copy to server/models/project.js

Before replacing files:
1. Back up your current App.jsx, App.css, server.js, and models/project.js.
2. Keep your existing server/.env MONGODB_URI line.
3. Add these lines to server/.env:
   LIBRETRANSLATE_URL=https://libretranslate.com
   LIBRETRANSLATE_API_KEY=
   The example provider may require a key or have availability/rate limits. Use a valid LibreTranslate-compatible provider URL and key if required.
4. Restart the backend and frontend.

How it works:
- "Words are in" selects the source language.
- "Translate meanings to" selects the target language.
- Click "Translate meanings to [language]". The original word is preserved and its translated meaning is added to the existing word text, so preview/export and saved projects can use it.
- Translation requires the backend endpoint and a working provider. Pinyin is not generated automatically; keep it in the second pipe-separated field if you have it.
- Node.js 18+ is recommended for built-in fetch and AbortSignal.timeout.
