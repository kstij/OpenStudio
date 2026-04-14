import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	DEFAULT_LOCALE,
	type I18nNamespace,
	LOCALE_STORAGE_KEY,
	type Locale,
	SUPPORTED_LOCALES,
} from "@/i18n/config";
import { translate } from "@/i18n/loader";

type TranslateVars = Record<string, string | number>;
type AppLocale = Exclude<Locale, undefined>;

interface I18nContextValue {
	locale: AppLocale;
	setLocale: (locale: Locale) => void;
	t: (qualifiedKey: string, vars?: TranslateVars) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
	const ctx = useContext(I18nContext);
	if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
	return ctx;
}

export function useScopedT(namespace: I18nNamespace) {
	const { locale } = useI18n();
	return useCallback(
		(key: string, vars?: TranslateVars): string => translate(locale, namespace, key, vars),
		[locale, namespace],
	);
}

function isSupportedLocale(value: string): value is AppLocale {
	return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function getInitialLocale(): AppLocale {
	try {
		const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
		if (stored && isSupportedLocale(stored)) return stored;
	} catch {
		// localStorage may be unavailable
	}
	return DEFAULT_LOCALE as AppLocale;
}

export function I18nProvider({ children }: { children: ReactNode }) {
	const [locale, setLocaleState] = useState<AppLocale>(getInitialLocale);

	const setLocale = useCallback((newLocale: Locale) => {
		const resolvedLocale =
			typeof newLocale === "string" && isSupportedLocale(newLocale)
				? newLocale
				: (DEFAULT_LOCALE as AppLocale);
		setLocaleState(resolvedLocale);
		try {
			localStorage.setItem(LOCALE_STORAGE_KEY, resolvedLocale);
		} catch {
			// localStorage may be unavailable
		}
		document.documentElement.lang = resolvedLocale;
		// Notify Electron main process
		window.electronAPI?.setLocale?.(resolvedLocale);
	}, []);

	useEffect(() => {
		document.documentElement.lang = locale;
	}, [locale]);

	const t = useCallback(
		(qualifiedKey: string, vars?: TranslateVars): string => {
			const dotIndex = qualifiedKey.indexOf(".");
			if (dotIndex === -1) return qualifiedKey;
			const namespace = qualifiedKey.slice(0, dotIndex) as I18nNamespace;
			const key = qualifiedKey.slice(dotIndex + 1);
			return translate(locale, namespace, key, vars);
		},
		[locale],
	);

	const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
