import { Link } from "react-router-dom"

function NotFound() {
  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="rounded-2xl bg-slate-900 border border-slate-700 p-8 text-center w-full max-w-md">
        <div className="text-6xl font-bold text-emerald-400">404</div>
        <div className="mt-2 text-xl font-semibold">Page not found</div>
        <p className="mt-2 text-slate-300">The route you requested does not exist.</p>
        <Link to="/" className="mt-4 inline-block rounded-lg bg-emerald-500 px-4 py-2 font-medium text-slate-900">Go Home</Link>
      </div>
    </div>
  )
}

export default NotFound
