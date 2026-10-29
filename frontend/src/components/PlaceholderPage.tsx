interface Props {
  title: string
  description: string
  badge?: string
}

export default function PlaceholderPage({ title, description, badge }: Props) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4 px-4"
      role="main"
    >
      {badge && (
        <span className="px-3 py-1 rounded-full bg-brand-orange/20 text-brand-orange text-xs font-semibold tracking-widest">
          {badge}
        </span>
      )}
      <h1 className="font-display text-3xl md:text-4xl font-bold text-white">{title}</h1>
      <p className="text-white/60 max-w-md">{description}</p>
      <div className="mt-4 px-4 py-2 rounded-lg border border-white/10 text-white/30 text-xs">
        Coming in next task
      </div>
    </div>
  )
}
