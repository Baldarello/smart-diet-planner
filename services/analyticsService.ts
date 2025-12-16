
import posthog from 'posthog-js';

const POSTHOG_KEY = process.env.POSTHOG_KEY;
const POSTHOG_HOST = process.env.POSTHOG_HOST;

export const initAnalytics = () => {
    if (POSTHOG_KEY) {
        posthog.init(POSTHOG_KEY, {
            api_host: POSTHOG_HOST,
            person_profiles: 'identified_only',
            capture_pageview: false, // We handle SPA navigation manually if needed, or let it capture history changes
        });
    } else {
        console.warn("PostHog Key not found. Analytics disabled.");
    }
};

export const identifyUser = (id: string, traits?: Record<string, any>) => {
    if (POSTHOG_KEY) {
        posthog.identify(id, traits);
    }
};

export const resetUser = () => {
    if (POSTHOG_KEY) {
        posthog.reset();
    }
};

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    if (POSTHOG_KEY) {
        posthog.capture(eventName, properties);
    } else {
        console.log(`[Analytics Dev] Event: ${eventName}`, properties);
    }
};

export default {
    init: initAnalytics,
    identify: identifyUser,
    reset: resetUser,
    track: trackEvent
};
