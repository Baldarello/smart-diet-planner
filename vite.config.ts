
import { URL, fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // FIX: Replace `process.cwd()` with `''` to resolve the TypeScript error.
    // Vite's `loadEnv` function will default to the current working directory when an empty string is provided,
    // which maintains the intended behavior of loading environment variables from the project root.
    const env = loadEnv(mode, '', '');
    return {
        base: './',
        plugins: [react()],
        define: {
            'process.env.APP_VERSION': JSON.stringify(process.env.npm_package_version),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        },
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./components', import.meta.url)),
            }
        }
    };
});
