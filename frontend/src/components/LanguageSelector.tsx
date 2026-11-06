import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Search, Check, X } from 'lucide-react'
import { SUPPORTED_LANGUAGES, getLanguageMeta, isRTL, type LanguageMeta } from '../i18n/languages'
import { changeAppLanguage } from '../i18n'

interface LanguageSelectorProps {
  className?: string
  compact?: boolean
}

export default function LanguageSelector({ className = '', compact = false }: LanguageSelectorProps) {
  const { i18n, t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const currentLang = useMemo(() => {
    return getLanguageMeta(i18n.language || 'en')
  }, [i18n.language])

  // Filter languages based on search query
  const filteredLanguages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return SUPPORTED_LANGUAGES
    return SUPPORTED_LANGUAGES.filter((lang) => {
      return (
        lang.name.toLowerCase().includes(q) ||
        lang.nativeName.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q) ||
        lang.region.toLowerCase().includes(q) ||
        lang.script.toLowerCase().includes(q)
      )
    })
  }, [searchQuery])

  // Handle outside click & escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
      // Focus search input after popover opens
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const selectLanguage = (code: string) => {
    changeAppLanguage(code)
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={t('app.selectLanguage', 'Select Preferred Language')}
        className={`flex items-center gap-2 rounded-xl border border-[#285274] bg-[#12385C] px-3 py-1.5 text-xs font-semibold text-[#F3F8FF] transition-all hover:border-[#2389D7] hover:bg-[#16426C] focus:outline-none focus:ring-2 focus:ring-[#25C5DC]/50 shadow-sm ${
          compact ? 'px-2 py-1' : ''
        }`}
      >
        <Globe className="h-4 w-4 text-[#25C5DC] shrink-0" aria-hidden="true" />
        <span className="font-bold tracking-wide">{currentLang.nativeName}</span>
        <span className="text-[10px] uppercase tracking-wider text-[#8ED8F5] opacity-90">
          ({currentLang.code})
        </span>
      </button>

      {/* Popover Modal / Dropdown */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={t('app.selectLanguage', 'Select Preferred Language')}
          className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-[#285274] bg-[#0B2545] p-3 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-[#285274]/70">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-[#25C5DC]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#F3F8FF]">
                {t('app.selectLanguage', 'Select Preferred Language')} (23)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-[#B6C9DC] hover:bg-[#12385C] hover:text-[#F3F8FF] transition-colors"
              aria-label={t('app.close', 'Close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative mt-2.5 mb-2">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8ED8F5]" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('app.searchLanguage', 'Search 23 Indian languages, states...')}
              className="w-full rounded-xl border border-[#285274] bg-[#071A33] py-1.5 pl-8 pr-8 text-xs text-[#F3F8FF] placeholder-[#8ED8F5]/60 outline-none transition-colors focus:border-[#25C5DC] focus:ring-1 focus:ring-[#25C5DC]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-[#B6C9DC] hover:text-[#F3F8FF]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Scrollable Language List */}
          <div className="max-h-72 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredLanguages.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#B6C9DC]">
                No language found matching &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              filteredLanguages.map((lang: LanguageMeta) => {
                const isSelected = lang.code === currentLang.code
                const rtl = isRTL(lang.code)
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => selectLanguage(lang.code)}
                    className={`w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-left transition-colors ${
                      isSelected
                        ? 'bg-[#2389D7] text-white font-semibold shadow-md'
                        : 'text-[#F3F8FF] hover:bg-[#12385C]'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold truncate">{lang.nativeName}</span>
                        <span
                          className={`text-xs truncate ${
                            isSelected ? 'text-blue-100' : 'text-[#8ED8F5]'
                          }`}
                        >
                          {lang.name}
                        </span>
                        {rtl && (
                          <span
                            className={`rounded px-1 text-[9px] font-bold uppercase tracking-wide ${
                              isSelected
                                ? 'bg-blue-800 text-white'
                                : 'bg-[#285274] text-[#8ED8F5]'
                            }`}
                          >
                            RTL
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] truncate mt-0.5 ${
                          isSelected ? 'text-blue-100/90' : 'text-[#B6C9DC]'
                        }`}
                      >
                        {lang.region} • {lang.script}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono uppercase ${
                          isSelected
                            ? 'bg-blue-800/80 text-white'
                            : 'bg-[#071A33] text-[#8ED8F5] border border-[#285274]'
                        }`}
                      >
                        {lang.code}
                      </span>
                      {isSelected && <Check className="h-4 w-4 text-white shrink-0" />}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer status notice */}
          <div className="mt-2.5 pt-2 border-t border-[#285274]/50 flex items-center justify-between text-[10px] text-[#B6C9DC]">
            <span>22 Scheduled Indian Languages + English</span>
            <span className="text-[#35C58B] flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#35C58B]"></span>
              Instant Zero-Refresh
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
