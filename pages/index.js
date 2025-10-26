import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function Home() {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="card max-w-2xl w-full text-center">
        <h1 className="text-3xl font-bold">🚀 AiClipX</h1>
        <p className="mt-2 text-sm text-neutral-400">Frontend template (Next.js + Tailwind)</p>
        <div className="mt-6 grid gap-3">
          <div className="text-left bg-neutral-800 rounded-md p-3 text-xs">
            <div><span className="font-semibold">Backend:</span> <code>{API_URL}</code></div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Link href="/upload" className="btn-primary">Open Upload Demo</Link>
            <a className="underline text-neutral-300" href={API_URL} target="_blank" rel="noreferrer">Ping Backend</a>
          </div>
        </div>
      </div>
    </main>
  )
}
