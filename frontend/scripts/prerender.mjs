// Gera um dist/<rota>/index.html por página pública, com <title>/OG/Twitter
// meta corretos para AQUELA página. Necessário porque o site é uma SPA: sem
// isto, crawlers que não executam JS (WhatsApp, Facebook, Twitter, alguns
// bots) sempre recebem o dist/index.html genérico, não importa qual URL foi
// compartilhada — react-helmet-async só troca as tags depois que o React
// hidrata no navegador.
//
// Funciona porque o Vercel serve um arquivo estático que exista no caminho
// exato ANTES de cair no rewrite catch-all (vercel.json manda tudo pra
// /index.html só quando não há arquivo correspondente) — então
// dist/universidades/ufpr/index.html responde direto pra /universidades/ufpr,
// com o HTML puro já certo, e o mesmo bundle JS hidrata por cima normalmente
// para quem abre no navegador.
//
// Roda depois do `vite build` (ver package.json). Usa tsx pra importar os
// arquivos .ts de dados direto, sem duplicar a lista de universidades aqui.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { UNIVERSITIES } from '../src/data/universities.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '..', 'dist')
const templatePath = path.join(distDir, 'index.html')

if (!fs.existsSync(templatePath)) {
  console.error('prerender: dist/index.html não existe — rode `vite build` antes.')
  process.exit(1)
}

const template = fs.readFileSync(templatePath, 'utf-8')
const SITE_URL = 'https://cognition-ai-edu.vercel.app'
const DEFAULT_IMAGE = `${SITE_URL}/docs/screenshots/login.png`

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderPage({ urlPath, title, description, image }) {
  const url = `${SITE_URL}${urlPath}`
  const img = image || DEFAULT_IMAGE
  const t = escapeHtml(title)
  const d = escapeHtml(description)

  return template
    .replace(/<title>.*?<\/title>/s, `<title>${t}</title>`)
    .replace(/<meta name="description" content=".*?"\s*\/>/s, `<meta name="description" content="${d}" />`)
    .replace(/<link rel="canonical" href=".*?"\s*\/>/s, `<link rel="canonical" href="${url}" />`)
    .replace(/<meta property="og:url" content=".*?"\s*\/>/s, `<meta property="og:url" content="${url}" />`)
    .replace(/<meta property="og:title" content=".*?"\s*\/>/s, `<meta property="og:title" content="${t}" />`)
    .replace(/<meta property="og:description" content=".*?"\s*\/>/s, `<meta property="og:description" content="${d}" />`)
    .replace(/<meta property="og:image" content=".*?"\s*\/>/s, `<meta property="og:image" content="${img}" />`)
    .replace(/<meta name="twitter:title" content=".*?"\s*\/>/s, `<meta name="twitter:title" content="${t}" />`)
    .replace(/<meta name="twitter:description" content=".*?"\s*\/>/s, `<meta name="twitter:description" content="${d}" />`)
    .replace(/<meta name="twitter:image" content=".*?"\s*\/>/s, `<meta name="twitter:image" content="${img}" />`)
}

function write(urlPath, html) {
  const dir = path.join(distDir, urlPath.replace(/^\//, ''))
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.html'), html)
}

// Mesmos title/description que cada página já passa pro componente <Seo> —
// mantidos aqui em sincronia manual (poucas páginas estáticas, mudam raro).
const STATIC_PAGES = [
  {
    urlPath: '/universidades',
    title: `Vestibulares e universidades no Brasil (${UNIVERSITIES.length} instituições) — calendário e cursos | Cognition AI`,
    description: `Guia com calendário, tipo de prova e cursos mais procurados de ${UNIVERSITIES.length} vestibulares brasileiros, incluindo ENEM, FUVEST, ITA, UFPR, UFRGS e mais.`,
  },
  {
    urlPath: '/calendario',
    title: 'Calendário de vestibulares 2027 — datas de inscrição e prova | Cognition AI',
    description: 'Calendário atualizado com datas de inscrição e prova dos principais vestibulares brasileiros: ENEM, FUVEST, ITA, UFPR, UFRGS e outros.',
  },
  {
    urlPath: '/plans',
    title: 'Planos e Preços — Cognition AI',
    description: 'Conheça os planos do Cognition AI para escolas: correção de provas e redações com IA, simulados de vestibular e gestão de turmas.',
  },
  {
    urlPath: '/quote',
    title: 'Solicitar orçamento — Cognition AI',
    description: 'Peça um orçamento personalizado do Cognition AI para sua escola: correção de provas e redações com IA e simulados de vestibular.',
  },
  {
    urlPath: '/contact',
    title: 'Fale conosco — Cognition AI',
    description: 'Entre em contato com o time do Cognition AI para dúvidas sobre a plataforma, suporte técnico ou parcerias com escolas.',
  },
  {
    urlPath: '/ajuda',
    title: 'Central de Ajuda — Cognition AI',
    description: 'Tire dúvidas sobre como usar o Cognition AI: correção de provas com IA, simulados de vestibular, cadastro de turmas e planos.',
  },
  {
    urlPath: '/sobre',
    title: 'Sobre o Cognition AI — plataforma de correção de provas com IA',
    description: 'Conheça o Cognition AI: como a plataforma corrige provas e redações com apoio de Inteligência Artificial e monta simulados de vestibular a partir de provas oficiais.',
  },
  {
    urlPath: '/termos',
    title: 'Termos de Uso — Cognition AI',
    description: 'Condições de uso da plataforma Cognition AI para escolas, professores e alunos: cadastro, assinatura, responsabilidades e limites de uso.',
  },
  {
    urlPath: '/privacidade',
    title: 'Política de Privacidade — Cognition AI',
    description: 'Como o Cognition AI coleta, usa e protege dados pessoais de professores, alunos e instituições de ensino na plataforma.',
  },
]

let count = 0
for (const page of STATIC_PAGES) {
  write(page.urlPath, renderPage(page))
  count++
}

for (const u of UNIVERSITIES) {
  const urlPath = `/universidades/${u.slug}`
  write(urlPath, renderPage({
    urlPath,
    title: `${u.shortName} (${u.fullName}) — Simulados, Provas e Informações | Cognition AI`,
    description: `Guia completo da ${u.fullName} (${u.shortName}): vestibulares, cursos mais procurados, formato de provas e simulados.`,
  }))
  count++
}

console.log(`prerender: ${count} páginas com meta tags próprias geradas em dist/.`)
