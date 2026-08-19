/**
 * Application bootstrap.
 *
 * Deliberately empty of two things itom had here:
 *
 *   1. No console branding signature (§7.12 defect 8 — itom printed "TOM KING PORTFOLIO").
 *      Nothing is written to the console in the public build.
 *   2. No analytics initialisation. The public build ships no third-party analytics,
 *      pixels or trackers of any kind (BUILD_CONTRACT §0.8) — itom's `posthog.init` is gone,
 *      not guarded. First-party events go to our own ingest through `services/events.js`.
 *
 * The provider stack lives in `App.jsx`, which is the root of the single continuous
 * application; this file only mounts it.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from '@/App';
import '@/styles/main.scss';

const container = document.getElementById('root');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
