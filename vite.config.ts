import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import laravel from 'laravel-vite-plugin';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

function inlineVueScriptSetupSrc() {
    return {
        name: 'inline-vue-script-setup-src',
        enforce: 'pre' as const,
        async transform(code: string, id: string) {
            if (!id.endsWith('.vue')) return null;

            const scriptTagPattern = /<script\b([^>]*)><\/script>/g;
            const setupAttrPattern = /\bsetup\b(?=(?:\s|$))/;
            const srcAttrPattern = /\bsrc\s*=\s*(['"])([^'"]+)\1/;

            const matches = Array.from(code.matchAll(scriptTagPattern));
            if (!matches.length) return null;

            let nextCode = code;

            for (const match of matches) {
                const [fullMatch, attrs = ''] = match;
                if (!setupAttrPattern.test(attrs)) continue;

                const srcMatch = attrs.match(srcAttrPattern);
                if (!srcMatch) continue;

                const resolvedSrcPath = resolve(dirname(id), srcMatch[2]);
                const scriptContents = await readFile(resolvedSrcPath, 'utf8');
                const cleanedAttrs = attrs
                    .replace(setupAttrPattern, '')
                    .replace(srcAttrPattern, '')
                    .trim()
                    .replace(/\s+/g, ' ');
                const openTag = cleanedAttrs
                    ? `<script setup ${cleanedAttrs}>`
                    : '<script setup>';
                const replacement = `${openTag}\n${scriptContents}\n</script>`;

                nextCode = nextCode.replace(fullMatch, replacement);
            }

            return nextCode === code
                ? null
                : {
                      code: nextCode,
                      map: null,
                  };
        },
    };
}

export default defineConfig({
    plugins: [
        inlineVueScriptSetupSrc(),
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
    test: {
        environment: 'node',
        include: ['resources/js/**/*.test.ts'],
    },
});
