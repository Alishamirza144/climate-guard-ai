import React from 'react'
import * as m from 'framer-motion/m'

export interface TabItem {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: string | number
}

export interface TabsProps {
  items: TabItem[]
  activeId: string
  onChange: (id: string) => void
  variant?: 'pills' | 'underline'
  className?: string
}

export function Tabs({
  items,
  activeId,
  onChange,
  variant = 'pills',
  className = '',
}: TabsProps) {
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % items.length
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + items.length) % items.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = items.length - 1
    } else {
      return
    }
    e.preventDefault()
    onChange(items[nextIndex].id)
  }

  return (
    <div
      role="tablist"
      aria-label="Content Tabs"
      className={`inline-flex items-center gap-1 p-1 rounded-xl border border-white/10 bg-navy-dark/70 backdrop-blur-md ${className}`}
    >
      {items.map((tab, idx) => {
        const isActive = tab.id === activeId
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`relative flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-lime select-none ${
              isActive ? 'text-navy font-bold' : 'text-white/70 hover:text-white'
            }`}
          >
            {isActive && variant === 'pills' && (
              <m.div
                layoutId="activeTabPill"
                className="absolute inset-0 bg-lime rounded-lg -z-10 shadow-glow"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            {isActive && variant === 'underline' && (
              <m.div
                layoutId="activeTabUnderline"
                className="absolute inset-x-2 -bottom-1 h-0.5 bg-lime -z-10 shadow-glow"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            {tab.icon && <span className="w-3.5 h-3.5 shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-navy text-lime' : 'bg-white/10 text-white/80'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
