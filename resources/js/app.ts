import { createInertiaApp } from '@inertiajs/vue3';
import Echo from 'laravel-echo';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import Pusher from 'pusher-js';
import type { DefineComponent } from 'vue';
import { createApp, h } from 'vue';
import '../css/app.css';
import { initializeTheme } from './composables/useAppearance';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Initialize Laravel Echo with Reverb (WebSockets)
type KurashRuntimeConfig = {
    REVERB_APP_KEY?: string;
    REVERB_HOST?: string;
    REVERB_PORT?: string | number;
    REVERB_SCHEME?: string;
};

type KurashEchoState = {
    status: 'booting' | 'connecting' | 'connected' | 'disconnected' | 'error' | 'unavailable';
    connected: boolean;
    host?: string;
    port?: number;
    forceTLS?: boolean;
    error?: unknown;
};

declare global {
    interface Window {
        Echo: Echo;
        Pusher: typeof Pusher;
        __KURASH_CONFIG__?: KurashRuntimeConfig;
        __KURASH_ECHO_STATE__?: KurashEchoState;
    }
}

function updateEchoState(state: KurashEchoState) {
    window.__KURASH_ECHO_STATE__ = state;
    window.dispatchEvent(new CustomEvent('kurash:echo-status', { detail: state }));
}

function resolveEchoConfig() {
    const runtimeConfig = window.__KURASH_CONFIG__ ?? {};
    const scheme = String(runtimeConfig.REVERB_SCHEME || import.meta.env.VITE_REVERB_SCHEME || 'https').trim().toLowerCase() === 'http'
        ? 'http'
        : 'https';
    const forceTLS = scheme === 'https';
    const defaultPort = forceTLS ? 443 : 80;
    const rawPort = runtimeConfig.REVERB_PORT ?? import.meta.env.VITE_REVERB_PORT ?? defaultPort;
    const parsedPort = Number(rawPort);

    return {
        key: String(runtimeConfig.REVERB_APP_KEY || import.meta.env.VITE_REVERB_APP_KEY || '').trim(),
        host: String(runtimeConfig.REVERB_HOST || import.meta.env.VITE_REVERB_HOST || window.location.hostname).trim() || window.location.hostname,
        port: Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : defaultPort,
        forceTLS,
    };
}

window.Pusher = Pusher;

const echoConfig = resolveEchoConfig();

try {
    updateEchoState({
        status: 'connecting',
        connected: false,
        host: echoConfig.host,
        port: echoConfig.port,
        forceTLS: echoConfig.forceTLS,
    });

    window.Echo = new Echo({
        broadcaster: 'reverb',
        key: echoConfig.key,
        wsHost: echoConfig.host,
        wsPort: echoConfig.port,
        wssPort: echoConfig.port,
        forceTLS: echoConfig.forceTLS,
        enabledTransports: ['ws', 'wss'],
    });

    window.Echo.connector.pusher.connection.bind('connected', () => {
        console.log('Successfully connected to Reverb', echoConfig);
        updateEchoState({
            status: 'connected',
            connected: true,
            host: echoConfig.host,
            port: echoConfig.port,
            forceTLS: echoConfig.forceTLS,
        });
    });

    window.Echo.connector.pusher.connection.bind('error', (err: any) => {
        console.error('Reverb connection error:', err);
        updateEchoState({
            status: 'error',
            connected: false,
            host: echoConfig.host,
            port: echoConfig.port,
            forceTLS: echoConfig.forceTLS,
            error: err,
        });
    });

    window.Echo.connector.pusher.connection.bind('disconnected', () => {
        console.log('Disconnected from Reverb');
        updateEchoState({
            status: 'disconnected',
            connected: false,
            host: echoConfig.host,
            port: echoConfig.port,
            forceTLS: echoConfig.forceTLS,
        });
    });
} catch (error) {
    console.error('Failed to initialize Reverb/Echo:', error);
    updateEchoState({
        status: 'unavailable',
        connected: false,
        host: echoConfig.host,
        port: echoConfig.port,
        forceTLS: echoConfig.forceTLS,
        error,
    });
}

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.vue`,
            import.meta.glob<DefineComponent>('./pages/**/*.vue'),
        ),
    setup({ el, App, props, plugin }) {
        createApp({ render: () => h(App, props) })
            .use(plugin)
            .mount(el);
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on page load...
initializeTheme();
