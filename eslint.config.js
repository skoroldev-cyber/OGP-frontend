import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'public', 'node_modules']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [js.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      // R3F extends JSX intrinsics at runtime; the plugin cannot see them.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // The React Compiler diagnostics in eslint-plugin-react-hooks v7 assume every value a
    // component touches flows through React's render cycle. The canvas layer deliberately does
    // not: per-frame work mutates shader uniforms and object3D transforms inside `useFrame`,
    // and the camera-override handshake passes ownership through refs so that no frame costs a
    // re-render. Both are architectural requirements, not shortcuts — §3.12 forbids the reading
    // surface from touching the canvas per frame, and §7.6 makes `setCameraOverride` the law by
    // which components hand the camera to one another.
    //
    // So `immutability` and `refs` are advisory here and remain errors everywhere else. The
    // rules that catch real defects — rules-of-hooks, exhaustive-deps, set-state-in-effect,
    // purity — stay at error strength in this directory too.
    files: ['src/components/canvas/**/*.{js,jsx}', 'src/experience/**/*.{js,jsx}'],
    rules: {
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
  {
    files: ['scripts/**/*.mjs', 'scripts/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
