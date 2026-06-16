'use client'

import { useTranslation } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n'

/**
 * LanguageSwitcher — Toggle between English and Hindi.
 * Persists the choice in localStorage via the i18n context.
 */
export default function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation()

  const languages: { code: Locale; label: string; flag: string }[] = [
    { code: 'en', label: 'EN', flag: '🇬🇧' },
    { code: 'hi', label: 'हिं', flag: '🇮🇳' },
  ]

  return (
    <div className="inline-flex border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLocale(lang.code)}
          className={`px-3 py-1.5 font-black text-xs uppercase transition-all
            ${locale === lang.code
              ? 'bg-black text-yellow-300'
              : 'bg-white text-black hover:bg-zinc-100'
            }
            ${lang.code !== languages[0].code ? 'border-l-2 border-black' : ''}
          `}
          aria-label={`Switch to ${lang.code === 'en' ? 'English' : 'Hindi'}`}
          aria-pressed={locale === lang.code}
        >
          {lang.flag} {lang.label}
        </button>
      ))}
    </div>
  )
}
