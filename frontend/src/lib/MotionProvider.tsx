import type { ReactNode } from 'react'
import { LazyMotion, MotionConfig } from 'framer-motion'

const loadMotionFeatures = () =>
  import('framer-motion').then(({ domAnimation }) => domAnimation)

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadMotionFeatures}>{children}</LazyMotion>
    </MotionConfig>
  )
}
