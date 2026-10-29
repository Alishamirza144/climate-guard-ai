import { Link } from 'react-router-dom'
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <h1 className="font-display text-6xl font-black text-lime">404</h1>
      <p className="text-white/60">Page not found.</p>
      <Link to="/" className="text-lime hover:underline text-sm">← Back to home</Link>
    </div>
  )
}
