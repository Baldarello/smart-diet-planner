import process from 'node:process';
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
            // Use API_KEY for Gemini, and check for VITE_ prefix for robustness
            'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY),
            // Check for VITE_ prefix for robustness on other keys
            'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID),
            'process.env.GOOGLE_API_KEY': JSON.stringify(env.GOOGLE_API_KEY || env.VITE_GOOGLE_API_KEY),
            'process.env.VAPID_PUBLIC_KEY': JSON.stringify(env.VAPID_PUBLIC_KEY || env.VITE_VAPID_PUBLIC_KEY),
            'process.env.BUILD_TYPE': JSON.stringify(env.BUILD_TYPE || 'web'),
        }
    };
});