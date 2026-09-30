// Gera dist/<rota>/index.html com o HTML COMPLETO de cada página pública
// (conteúdo + <title>/meta/JSON-LD), renderizado via SSR do mesmo código React
// do app. Sem isto o site é uma SPA e crawlers (Googlebot incluso, que
// renderiza JS só numa segunda onda, além de WhatsApp/Facebook/etc.) recebem
// um <div id="root"> vazio.
//
// Pipeline (ver package.json): vite build (cliente) -> vite build --ssr
// (dist-ssr/entry-server.js) -> este script.
//
// Funciona porque o Vercel serve um arquivo estático que exista no caminho
// exato ANTES de aplicar o rewrite catch-all do vercel.json. No navegador o
// bundle cliente (createRoot) substitui o conteúdo prerenderizado.
//
// dist/index.html vira a home prerenderizada; o shell vazio original é salvo
// em dist/app-shell.html e é o destino do rewrite para as rotas do app
// (login, dashboard...), que não devem piscar o conteúdo da home.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const distDir = path.join(root, 'dist')
const ssrDir = path.join(root, 'dist-ssr')
const templatePath = path.join(distDir, 'index.html')

if (!fs.existsSync(templatePath)) {
  console.error('prerender: dist/index.html não existe — rode `vite build` antes.')
  process.exit(1)
}
const entryPath = path.join(ssrDir, 'entry-server.js')
if (!fs.existsSync(entryPath)) {
  console.error('prerender: dist-ssr/entry-server.js não existe — rode `vite build --ssr src/entry-server.tsx --outDir dist-ssr`.')
  process.exit(1)
}

const { render, getPublicPaths } = await import(pathToFileURL(entryPath).href)

const shell = fs.readFileSync(templatePath, 'utf-8')
fs.writeFileSync(path.join(distDir, 'app-shell.html'), shell)

// Tags de <head> que o <Seo> (react-helmet) fornece por página; as do shell
// genérico são removidas para não duplicar.
const HEAD_TAGS_TO_REPLACE = [
  /<title>.*?<\/title>\s*/s,
  /<meta name="description"[^>]*>\s*/g,
  /<link rel="canonical"[^>]*>\s*/g,
  /<meta property="og:(?:url|title|description|image)"[^>]*>\s*/g,
  /<meta name="twitter:(?:title|description|image)"[^>]*>\s*/g,
]

function buildPage(urlPath) {
  const { html, head } = render(urlPath)
  let out = shell
  if (head.trim()) {
    for (const re of HEAD_TAGS_TO_REPLACE) out = out.replace(re, '')
    out = out.replace('</head>', `    ${head}\n  </head>`)
  }
  if (!out.includes('<div id="root"></div>')) {
    throw new Error('prerender: <div id="root"></div> não encontrado no template')
  }
  return out.replace('<div id="root"></div>', () => `<div id="root">${html}</div>`)
}

function write(urlPath, content) {
  const file = urlPath === '/'
    ? path.join(distDir, 'index.html')
    : path.join(distDir, urlPath.replace(/^\//, ''), 'index.html')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

let count = 0
for (const p of getPublicPaths()) {
  write(p, buildPage(p))
  count++
}

// sitemap.xml gerado das mesmas rotas prerenderizadas (antes era mantido à mão).
const SITE_URL = 'https://cognition-ai-edu.vercel.app'
const today = new Date().toISOString().slice(0, 10)
const EXTRA_URLS = ['/aluno', '/login', '/docs/manual-aluno.html', '/docs/manual-professor.html', '/docs/manual-administrador.html']

function priorityFor(p) {
  if (p === '/') return '1.0'
  if (p.endsWith('/como-estudar')) return '0.7'
  if (p === '/universidades' || p === '/calendario' || p === '/plans') return '0.8'
  if (p.startsWith('/universidades/')) return '0.5'
  if (p === '/privacidade' || p === '/termos') return '0.3'
  return '0.6'
}

const sitemapUrls = [...getPublicPaths(), ...EXTRA_URLS]
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(p => `  <url>
    <loc>${SITE_URL}${p === '/' ? '/' : p}</loc>
    <lastmod>${today}</lastmod>
    <priority>${priorityFor(p)}</priority>
  </url>`).join('\n')}
</urlset>
`
fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap)

fs.rmSync(ssrDir, { recursive: true, force: true })
console.log(`prerender: ${count} páginas com HTML completo geradas em dist/ (+ sitemap.xml).`)
