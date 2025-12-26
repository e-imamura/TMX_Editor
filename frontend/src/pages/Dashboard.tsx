import React, { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost, useAuth } from '@/services/api'

type TuvMap = Record<string, string>
type TU = { index: number; segs: TuvMap }
type TmxDoc = { id: string, summary: { tuCount: number, langs: string[] }, tus: TU[] }

export default function Dashboard() {
  const { token } = useAuth()
  const [backendMsg, setBackendMsg] = useState('...')
  const [tmx, setTmx] = useState<TmxDoc | null>(null)
  const [selectedLang, setSelectedLang] = useState('pt-BR')
  const [edits, setEdits] = useState<Record<string, string>>({})

  useEffect(() => { apiGet('/api/hello').then((d) => setBackendMsg(d.message)).catch((e) => setBackendMsg('Erro: ' + e.message)) }, [token])

  const onUploadTmx = async (file: File) => {
    const form = new FormData(); form.append('tmx', file)
    const res = await fetch('/api/tmx/upload', { method: 'POST', body: form, headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const data: TmxDoc = await res.json()
    setTmx(data)
    setSelectedLang(data.summary.langs.includes('pt-BR') ? 'pt-BR' : data.summary.langs[0])
    setEdits({})
  }

  const saveTu = async (index: number) => {
    if (!tmx) return
    const newText = edits[String(index)]
    const updated = await apiPost(`/api/tmx/${tmx.id}/update`, { tuIndex: index, lang: selectedLang, text: newText })
    setTmx(updated)
  }

  const downloadTmx = async () => {
    if (!tmx) return
    const res = await fetch(`/api/tmx/${tmx.id}/export`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'export.tmx'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  const langs = useMemo(() => tmx?.summary.langs ?? [], [tmx])

  return (
    <div>
      <div className="card">
        <h2>Upload & Export</h2>
        <div className="row">
          <input type="file" accept=".tmx,application/xml,text/xml" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadTmx(f) }} />
          {tmx && (<>
            <select value={selectedLang} onChange={(e) => setSelectedLang(e.target.value)}>
              {langs.map((l) => (<option key={l} value={l}>{l}</option>))}
            </select>
            <button onClick={downloadTmx}>Download TMX</button>
          </>)}
        </div>
      </div>

      {tmx && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h2>Editar TUs ({selectedLang})</h2>
          <p><strong>TUs:</strong> {tmx.summary.tuCount} | <strong>Idiomas:</strong> {langs.join(', ')}</p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                {langs.map((l) => (<th key={l}>{l}</th>))}
                <th>Editar</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {tmx.tus.map((tu) => (
                <tr key={tu.index}>
                  <td>{tu.index}</td>
                  {langs.map((l) => (<td key={l}>{tu.segs[l] ?? ''}</td>))}
                  <td>
                    <input value={edits[String(tu.index)] ?? tu.segs[selectedLang] ?? ''}
                      onChange={(e) => setEdits((p) => ({ ...p, [String(tu.index)]: e.target.value }))} />
                  </td>
                  <td>
                    <button onClick={() => saveTu(tu.index)}>Salvar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="space" />
      <p><strong>Backend:</strong> {backendMsg}</p>
    </div>
  )
}
