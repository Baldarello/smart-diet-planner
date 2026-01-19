
import process from 'node:process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Using process.cwd() is the correct and standard way for Vite to find .env files.
    const env = loadEnv(mode, process.cwd(), '');

    // Helper to resolve environment variables from various sources (env file, process.env, VITE_ prefix)
    // This ensures that variables set in CI/CD (like GitHub Actions secrets mapped to env vars) are picked up
    // even if loadEnv doesn't automatically merge them in some configurations.
    const getEnvVar = (key: string) => {
        // Check for the key itself
        if (env[key]) return env[key];
        if (process.env[key]) return process.env[key];
        
        // Check for VITE_ prefix
        const viteKey = `VITE_${key}`;
        if (env[viteKey]) return env[viteKey];
        if (process.env[viteKey]) return process.env[viteKey];
        
        return undefined;
    };

    return {
        base: './',
        plugins: [react()],
        define: {
            'process.env.APP_VERSION': JSON.stringify(process.env.npm_package_version),
            
            // Use API_KEY for Gemini
            'process.env.API_KEY': JSON.stringify(getEnvVar('API_KEY')),
            
            // Auth & Push
            'process.env.GOOGLE_CLIENT_ID': JSON.stringify(getEnvVar('GOOGLE_CLIENT_ID')),
            'process.env.VAPID_PUBLIC_KEY': JSON.stringify(getEnvVar('VAPID_PUBLIC_KEY')),
            
            // Analytics
            'process.env.POSTHOG_KEY': JSON.stringify(getEnvVar('POSTHOG_KEY')),
            'process.env.POSTHOG_HOST': JSON.stringify(getEnvVar('POSTHOG_HOST') || 'https://app.posthog.com'),
            
            // Misc
            'process.env.BUILD_TYPE': JSON.stringify(env.BUILD_TYPE || 'web'),
        }
    };
});
