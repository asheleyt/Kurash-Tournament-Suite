import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import laravel from 'laravel-vite-plugin';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laravel({
            input: [resolve(process.env.KURASH_APP_ROOT ?? '.', 'resources/js/app.ts')],
            ssr: resolve(process.env.KURASH_APP_ROOT ?? '.', 'resources/js/ssr.ts'),
            publicDirectory: resolve(process.env.KURASH_APP_ROOT ?? '.', 'public'),
            refresh: true,
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
        vue({
            template: {
                transformAssetUrls: {
                    base: null,
                    includeAbsolute: false,
                },
            },
        }),
    ],
});
