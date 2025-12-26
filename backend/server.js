const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const multer = require('multer')
const { XMLParser, XMLBuilder } = require('fast-xml-parser')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret'
app.use(cors({ origin: 'http://localhost:5173', credentials: false }))
app.use(express.json())

const users = new Map()
const store = new Map()
if (!users.has('demo')) { users.set('demo', { username: 'demo', passwordHash: bcrypt.hashSync('demo', 10) }) }
function signToken(username) { return jwt.sign({ sub: username }, JWT_SECRET, { expiresIn: '2h' }) }
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || ''; const parts = auth.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Token ausente' })
  try { const payload = jwt.verify(parts[1], JWT_SECRET); req.user = { username: payload.sub }; next() } catch { return res.status(401).json({ error: 'Token inválido' }) }
}

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))
app.get('/api/hello', (req, res) => res.json({ message: 'Backend v1.1 online em ' + new Date().toLocaleString() }))
app.post('/api/auth/register', (req, res) => { const { username, password } = req.body || {}; if (!username || !password) return res.status(400).json({ error: 'username e password obrigatórios' }); if (users.has(username)) return res.status(409).json({ error: 'Usuário já existe' }); users.set(username, { username, passwordHash: bcrypt.hashSync(String(password), 10) }); res.status(201).json({ ok: true }) })
app.post('/api/auth/login', (req, res) => { const { username, password } = req.body || {}; const user = users.get(username); if (!user) return res.status(401).json({ error: 'Credenciais inválidas' }); const ok = bcrypt.compareSync(String(password || ''), user.passwordHash); if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' }); res.json({ token: signToken(username) }) })
app.get('/api/auth/me', authMiddleware, (req, res) => res.json({ username: req.user.username }))

const upload = multer({ storage: multer.memoryStorage() })
function normalizeTMX(xmlString) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  const obj = parser.parse(xmlString); const tmx = obj.tmx || obj.TMX || obj; const body = tmx.body || tmx.Body
  let tus = body?.tu || body?.TU || []; if (!Array.isArray(tus)) tus = tus ? [tus] : []
  const langsSet = new Set(); const normalized = tus.map((tu, idx) => { let tuvArr = tu.tuv || tu.TUV || []; if (!Array.isArray(tuvArr)) tuvArr = tuvArr ? [tuvArr] : []; const segs = {}; for (const tuv of tuvArr) { const lang = tuv['@_xml:lang'] || tuv['@_lang'] || tuv['@_locale'] || 'und'; const seg = (tuv.seg || tuv.SEG || '').toString(); segs[lang] = seg; langsSet.add(lang) } return { index: idx, segs } })
  return { raw: obj, tus: normalized, langs: Array.from(langsSet) }
}

app.post('/api/tmx/upload', authMiddleware, upload.single('tmx'), (req, res) => { if (!req.file) return res.status(400).json({ error: 'Arquivo TMX ausente' }); const { raw, tus, langs } = normalizeTMX(req.file.buffer.toString('utf-8')); const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); store.set(id, { raw, tus, langs, owner: req.user.username }); res.json({ id, summary: { tuCount: tus.length, langs }, tus }) })
app.get('/api/tmx/:id', authMiddleware, (req, res) => { const data = store.get(req.params.id); if (!data) return res.status(404).json({ error: 'TMX não encontrado' }); if (data.owner !== req.user.username) return res.status(403).json({ error: 'Sem acesso' }); res.json({ id: req.params.id, summary: { tuCount: data.tus.length, langs: data.langs }, tus: data.tus }) })
app.post('/api/tmx/:id/update', authMiddleware, (req, res) => { const { tuIndex, lang, text } = req.body || {}; const data = store.get(req.params.id); if (!data) return res.status(404).json({ error: 'TMX não encontrado' }); if (data.owner !== req.user.username) return res.status(403).json({ error: 'Sem acesso' }); if (typeof tuIndex !== 'number' || !lang) return res.status(400).json({ error: 'tuIndex e lang são obrigatórios' }); const tu = data.tus.find((t) => t.index === tuIndex); if (!tu) return res.status(404).json({ error: 'TU não encontrada' }); tu.segs[lang] = String(text ?? ''); if (!data.langs.includes(lang)) data.langs.push(lang); res.json({ id: req.params.id, summary: { tuCount: data.tus.length, langs: data.langs }, tus: data.tus }) })
app.get('/api/tmx/:id/export', authMiddleware, (req, res) => { const data = store.get(req.params.id); if (!data) return res.status(404).json({ error: 'TMX não encontrado' }); if (data.owner !== req.user.username) return res.status(403).json({ error: 'Sem acesso' }); const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_', format: true }); const out = { tmx: { '@_version': '1.4', header: { '@_creationtool': 'TMX-Platform', '@_segtype': 'sentence' }, body: { tu: data.tus.map((tu) => ({ tuv: Object.entries(tu.segs).map(([lang, text]) => ({ '@_xml:lang': lang, seg: text })) })) } } }; const xml = builder.build(out); res.setHeader('Content-Type', 'application/xml'); res.setHeader('Content-Disposition', 'attachment; filename="export.tmx"'); res.send(xml) })

app.listen(PORT, () => console.log(`Backend v1.1 rodando em http://localhost:${PORT}`))
