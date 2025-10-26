import { useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function Upload() {
  const [script, setScript] = useState('一个女孩走在油菜花田中，阳光温暖，画面清新。')
  const [language, setLanguage] = useState('zh')
  const [style, setStyle] = useState('vlog')
  const [useBroll, setUseBroll] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, language, style, use_broll: useBroll })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(JSON.stringify(data))
      setResult(data)
    } catch (err) {
      setError(err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="card">
        <h2 className="text-2xl font-semibold">🎬 Generate Video (Demo)</h2>
        <form onSubmit={onSubmit} className="mt-4 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm text-neutral-300">Script 文案</span>
            <textarea value={script} onChange={e=>setScript(e.target.value)} rows={3} className="w-full rounded-md p-3 bg-neutral-800 border border-neutral-700" />
          </label>
          <div className="grid md:grid-cols-3 gap-3">
            <label className="grid gap-2">
              <span className="text-sm text-neutral-300">Language</span>
              <select value={language} onChange={e=>setLanguage(e.target.value)} className="rounded-md p-2 bg-neutral-800 border border-neutral-700">
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-neutral-300">Style</span>
              <select value={style} onChange={e=>setStyle(e.target.value)} className="rounded-md p-2 bg-neutral-800 border border-neutral-700">
                <option value="vlog">vlog</option>
                <option value="clean">clean</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-neutral-300">Use B-roll</span>
              <input type="checkbox" checked={useBroll} onChange={e=>setUseBroll(e.target.checked)} />
            </label>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full md:w-auto">{loading ? 'Generating...' : 'Submit to Backend'}</button>
        </form>

        <div className="mt-6">
          {result && (
            <pre className="bg-neutral-800 rounded-md p-3 overflow-auto text-xs">{JSON.stringify(result, null, 2)}</pre>
          )}
          {error && (
            <div className="text-red-400 text-sm">Error: {error}</div>
          )}
        </div>
      </div>
    </main>
  )
}
