import '@testing-library/jest-dom'

class MockIntersectionObserver implements IntersectionObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}

  readonly root: Element | Document | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []

  disconnect(): void {}
  observe(target: Element): void {
    const rect = target.getBoundingClientRect()
    this.callback(
      [
        {
          target,
          isIntersecting: true,
          intersectionRatio: 1,
          time: 0,
          rootBounds: null,
          boundingClientRect: rect,
          intersectionRect: rect,
        },
      ],
      this
    )
  }
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
  unobserve(): void {}
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
})

Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
})
