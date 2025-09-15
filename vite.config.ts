
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
            'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
            'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.VITE_GOOGLE_CLIENT_ID),
            'process.env.GOOGLE_API_KEY': JSON.stringify(env.VITE_GOOGLE_API_KEY),
        },
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./components', import.meta.url)),
            }
        }
    };
});