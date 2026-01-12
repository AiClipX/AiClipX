import Link from 'next/link'
import dynamic from 'next/dynamic'

const AuthDebug = dynamic(() => import('../components/AuthDebug'), { ssr: false });
const TestCreateVariations = dynamic(() => import('../components/TestCreateVariations'), { ssr: false });
const DirectAPITest = dynamic(() => import('../components/DirectAPITest'), { ssr: false });
const ExactAPITest = dynamic(() => import('../components/ExactAPITest'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function Home() {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="card max-w-4xl w-full text-center">
        <h1 className="text-3xl font-bold">🚀 AiClipX</h1>
        <p className="mt-2 text-sm text-neutral-400">AI Video Generation Platform</p>
        <div className="mt-6 grid gap-3">
          <div className="text-left bg-neutral-800 rounded-md p-3 text-xs">
            <div><span className="font-semibold">Backend:</span> <code>{API_URL}</code></div>
            <div><span className="font-semibold">API Video:</span> <code>{process.env.NEXT_PUBLIC_API_VIDEO}</code></div>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Link href="/dashboard" className="btn-primary">Open Dashboard</Link>
            <Link href="/upload" className="btn-primary">Upload Demo</Link>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          <AuthDebug />
          <DirectAPITest />
          <ExactAPITest />
          <TestCreateVariations />
        </div>
      </div>
    </main>
  )
}
