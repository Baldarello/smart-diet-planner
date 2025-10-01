/// <reference types="node" />

// Fix: Reverted to using the triple-slash directive to provide global Node.js types.
// The explicit import of 'process' was not resolving types correctly.
// This ensures the global 'process' object is correctly typed for `process.cwd()` and `process.env`.
import { URL, fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Using process.cwd() is the correct and standard way for Vite to find .env files.
    // The previous use of '' was an incorrect attempt to fix a TypeScript error
    // and likely resulted in environment variables not being loaded, causing a startup crash.
    const env = loadEnv(mode, process.cwd(), '');
    return {
        base: './',
        plugins: [react()],
        define: {
            'process.env.APP_VERSION': JSON.stringify(process.env.npm_package_version),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID),
            'process.env.GOOGLE_API_KEY': JSON.stringify(env.GOOGLE_API_KEY),
        },
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./components', import.meta.url)),
            }
        }
    };
});