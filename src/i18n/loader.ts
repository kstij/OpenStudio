import { DEFAULT_LOCALE, type I18nNamespace, type Locale } from "./config";

type MessageMap = Record<string, unknown>;
type AppLocale = Exclude<Locale, undefined>;

const modules = import.meta.glob("./locales/**/*.json", { eager: true }) as Record<
	string,
	{ default: MessageMap }
>;

const messages: Partial<Record<AppLocale, Partial<Record<I18nNamespace, MessageMap>>>> = {};

for (const [path, mod] of Object.entries(modules)) {
	// path looks like "./locales/en/common.json"
	const parts = path.replace("./locales/", "").replace(".json", "").split("/");
	const locale = parts[0] as AppLocale | undefined;
	const namespace = parts[1] as I18nNamespace | undefined;
	if (!locale || !namespace) continue;
	if (!messages[locale]) messages[locale] = {};
	messages[locale][namespace] = mod.default;
}

function resolveLocale(locale: Locale): AppLocale {
	if (typeof locale === "string") {
		return locale as AppLocale;
	}
	return DEFAULT_LOCALE as AppLocale;
}

function getMessageValue(obj: unknown, dotPath: string): string | undefined {
	const keys = dotPath.split(".");
	let current: unknown = obj;
	for (const key of keys) {
		if (current == null || typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[key];
	}
	return typeof current === "string" ? current : undefined;
}

function interpolate(str: string, vars?: Record<string, string | number>): string {
	if (!vars) return str;
	return str.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(vars[key] ?? `{{${key}}}`));
}

export function getMessages(locale: Locale, namespace: I18nNamespace): MessageMap {
	const resolvedLocale = resolveLocale(locale);
	return messages[resolvedLocale]?.[namespace] ?? {};
}

export function getLocaleName(locale: Locale): string {
	const resolvedLocale = resolveLocale(locale);
	return getMessageValue(messages[resolvedLocale]?.common, "locale.name") ?? resolvedLocale;
}

export function getLocaleShort(locale: Locale): string {
	const resolvedLocale = resolveLocale(locale);
	return getMessageValue(messages[resolvedLocale]?.common, "locale.short") ?? resolvedLocale;
}

export function translate(
	locale: Locale,
	namespace: I18nNamespace,
	key: string,
	vars?: Record<string, string | number>,
): string {
	const resolvedLocale = resolveLocale(locale);
	const value =
		getMessageValue(messages[resolvedLocale]?.[namespace], key) ??
		getMessageValue(messages[DEFAULT_LOCALE as AppLocale]?.[namespace], key);

	if (value == null) return `${namespace}.${key}`;
	return interpolate(value, vars);
}
