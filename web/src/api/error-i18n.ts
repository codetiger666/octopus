import { useSettingStore, type Locale } from '@/stores/setting';

import zhHansMessages from '../../public/locale/zh_hans.json';
import zhHantMessages from '../../public/locale/zh_hant.json';
import enMessages from '../../public/locale/en.json';

const messages: Record<Locale, unknown> = {
    zh_hans: zhHansMessages,
    zh_hant: zhHantMessages,
    en: enMessages,
};

type ErrorValues = Record<string, string | number>;

function lookupMessage(source: unknown, path: string): string | null {
    let current: unknown = source;
    for (const part of path.split('.')) {
        if (!current || typeof current !== 'object' || Array.isArray(current)) {
            return null;
        }
        current = (current as Record<string, unknown>)[part];
    }
    return typeof current === 'string' ? current : null;
}

function interpolate(template: string, values?: ErrorValues): string {
    if (!values) return template;
    return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

export function translateApiErrorCode(
    errorCode: string | null | undefined,
    fallback: string,
    values?: ErrorValues,
): string {
    const normalizedCode = typeof errorCode === 'string' ? errorCode.trim() : '';
    if (!normalizedCode) return fallback;

    const locale = useSettingStore.getState().locale;
    const key = `errors.${normalizedCode}`;
    const translated = lookupMessage(messages[locale], key)
        || lookupMessage(messages.zh_hans, key)
        || lookupMessage(messages.en, key);

    return translated ? interpolate(translated, values) : fallback;
}
