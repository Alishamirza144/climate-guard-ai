import React, { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import * as m from 'framer-motion/m'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactElement
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function Tooltip({
  content,
  children,
  position = 'top',
  className = '',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position]

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {React.cloneElement(children, {
        'aria-label': typeof content === 'string' ? content : undefined,
      })}
      <AnimatePresence>
        {isVisible && (
          <m.div
            role="tooltip"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`pointer-events-none absolute z-50 px-2.5 py-1 text-xs font-medium text-white bg-navy-dark/95 border border-white/15 rounded-lg shadow-xl backdrop-blur-md whitespace-nowrap ${positionStyles} ${className}`}
          >
            {content}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
