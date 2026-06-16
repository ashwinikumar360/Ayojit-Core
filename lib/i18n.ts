/**
 * lib/i18n.ts — Lightweight internationalization engine.
 *
 * Provides React context, hook, and provider for English/Hindi translations.
 * No external i18n library dependency. Translation dictionaries are loaded
 * from JSON files in lib/locales/.
 */

'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import en from './locales/en.json'
import hi from './locales/hi.json'

export type Locale = 'en' | 'hi'

const dictionaries: Record<Locale, Record<string, string>> = { en, hi }

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, fallback?: string) => string
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key: string) => key,
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  // Load saved preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ayojit_locale')
    if (saved === 'hi' || saved === 'en') {
      setLocaleState(saved)
    }
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('ayojit_locale', newLocale)
  }, [])

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const dict = dictionaries[locale] || dictionaries.en
      return dict[key] || fallback || key
    },
    [locale]
  )

  return React.createElement(
    I18nContext.Provider,
    { value: { locale, setLocale, t } },
    children
  )
}

export function useTranslation() {
  return useContext(I18nContext)
}

export function useLocale(): Locale {
  const { locale } = useContext(I18nContext)
  return locale
}
