import type { EnemPdfImportResult, UfscPdfImportResult, ItaPdfImportResult, AcafeUrlImportResult, PucprUrlImportResult } from '../api'
import { MiniBar } from './OwnerPage'
import { useState } from 'react'
import {
  enemApi, acafeApi, ufprApi, ufscApi, itaApi, uerjApi, ufgdApi, uemApi, ufmsApi, fuvestApi,
  pucrioApi, udescApi, unespApi, cebraspeApi, unifespApi, espmApi, fgvApi, pucprApi, pucrsApi,
  ufpelApi, ufrgsApi, unicampApi, ufgApi, ufjfApi, ufuApi, ufpaApi, utfprApi, unioesteApi,
  uelApi, pucminasApi, ufrnApi, ufsmApi, ulbraApi, ufamApi,
  puccampinasApi, unimontesApi, unicentroApi, unaerpApi,
  ownerApi
} from '../api'

type ImportSource = {
  key: string
  label: string
  description: string
  runSeed: (since_year?: number, until_year?: number) => Promise<any>
}

const IMPORT_SOURCES: ImportSource[] = [
  { key: 'enem', label: 'ENEM', description: 'Varredura ENEM no site do INEP (PDF)', runSeed: (s?: number, u?: number) => enemApi.runImportAll(s, u) },
  { key: 'acafe', label: 'ACAFE', description: 'Vestibular ACAFE — Santa Catarina (PDF)', runSeed: (s?: number, u?: number) => acafeApi.runSeed(s, u) },
  { key: 'ufpr', label: 'UFPR', description: 'Coletânea UFPR 2010–2026 (PDF + OCR de gabarito)', runSeed: (s?: number, u?: number) => ufprApi.runSeed(s, u) },
  { key: 'ufsc', label: 'UFSC', description: 'Vestibular UFSC/IFSC/IFC — varredura online (vestibularunificado2025.ufsc.br). Preencha Ano Inicial E Ano Final (ex: 2020–2020) para evitar OOM no plano free.', runSeed: (s?: number, u?: number) => ufscApi.runImportAll(s, u) },
  { key: 'ita', label: 'ITA', description: 'Varredura automática do site do ITA (2019-2026) (PDF)', runSeed: (s?: number, u?: number) => itaApi.runImportAll(s, u) },
  { key: 'uerj', label: 'UERJ', description: 'Importador UERJ (PDF)', runSeed: (s?: number, u?: number) => uerjApi.runImportAll(s, u) },
  { key: 'ufgd', label: 'UFGD', description: 'Importador UFGD (PDF)', runSeed: (s?: number, u?: number) => ufgdApi.runImportAll(s, u) },
  { key: 'uem', label: 'UEM', description: 'Importador UEM (PDF)', runSeed: (s?: number, u?: number) => uemApi.runImportAll(s, u) },
  { key: 'ufms', label: 'UFMS', description: 'Importador UFMS (PDF)', runSeed: (s?: number, u?: number) => ufmsApi.runImportAll(s, u) },
  { key: 'fuvest', label: 'FUVEST', description: 'Importador USP/FUVEST (PDF)', runSeed: (s?: number, u?: number) => fuvestApi.runImportAll(s, u) },
  { key: 'pucrio', label: 'PUC-Rio', description: 'Importador PUC-Rio (PDF)', runSeed: (s?: number, u?: number) => pucrioApi.runImportAll(s, u) },
  { key: 'udesc', label: 'UDESC', description: 'Importador UDESC (PDF)', runSeed: (s?: number, u?: number) => udescApi.runImportAll(s, u) },
  { key: 'unesp', label: 'UNESP', description: 'Importador UNESP (PDF)', runSeed: (s?: number, u?: number) => unespApi.runSeed(s, u) },
  { key: 'cebraspe', label: 'UnB/CEBRASPE', description: 'Importador UnB/CEBRASPE (PDF) - Certo/Errado', runSeed: (s?: number, u?: number) => cebraspeApi.runSeed(s, u) },
  { key: 'unifesp', label: 'UNIFESP', description: 'Importador UNIFESP (PDF)', runSeed: (s?: number, u?: number) => unifespApi.runSeed(s, u) },
  { key: 'espm', label: 'ESPM', description: 'Importador ESPM (PDF)', runSeed: (s?: number, u?: number) => espmApi.runImportAll(s, u) },
  { key: 'fgv', label: 'FGV', description: 'Importador FGV (PDF)', runSeed: (s?: number, u?: number) => fgvApi.runImportAll(s, u) },
  { key: 'pucpr', label: 'PUCPR', description: 'Importador PUCPR (PDF)', runSeed: (s?: number, u?: number) => pucprApi.runImportAll(s, u) },
  { key: 'pucrs', label: 'PUCRS', description: 'Importador PUCRS (PDF)', runSeed: (s?: number, u?: number) => pucrsApi.runImportAll(s, u) },
  { key: 'ufpel', label: 'UFPEL', description: 'Importador UFPEL (PDF)', runSeed: (s?: number, u?: number) => ufpelApi.runImportAll(s, u) },
  { key: 'ufrgs', label: 'UFRGS', description: 'Importador UFRGS (PDF)', runSeed: (s?: number, u?: number) => ufrgsApi.runImportAll(s, u) },
  { key: 'unicamp', label: 'UNICAMP', description: 'Importador UNICAMP (PDF)', runSeed: (s?: number, u?: number) => unicampApi.runImportAll(s, u) },
  { key: 'ufg', label: 'UFG', description: 'Importador UFG (PDF)', runSeed: (s?: number, u?: number) => ufgApi.runImportAll(s, u) },
  { key: 'ufjf', label: 'UFJF', description: 'Importador UFJF (PDF)', runSeed: (s?: number, u?: number) => ufjfApi.runImportAll(s, u) },
  { key: 'ufu', label: 'UFU', description: 'Importador UFU (PDF)', runSeed: (s?: number, u?: number) => ufuApi.runImportAll(s, u) },
  { key: 'ufpa', label: 'UFPA', description: 'Importador UFPA (PDF)', runSeed: (s?: number, u?: number) => ufpaApi.runImportAll(s, u) },
  { key: 'utfpr', label: 'UTFPR', description: 'Importador UTFPR (PDF)', runSeed: (s?: number, u?: number) => utfprApi.runImportAll(s, u) },
  { key: 'unioeste', label: 'UNIOESTE', description: 'Importador UNIOESTE (PDF)', runSeed: (s?: number, u?: number) => unioesteApi.runImportAll(s, u) },
  { key: 'uel', label: 'UEL', description: 'Importador UEL (PDF)', runSeed: (s?: number, u?: number) => uelApi.runImportAll(s, u) },
  { key: 'pucminas', label: 'PUCMINAS', description: 'Importador PUCMINAS (PDF)', runSeed: (s?: number, u?: number) => pucminasApi.runImportAll(s, u) },
  { key: 'ufrn', label: 'UFRN', description: 'Importador UFRN (PDF)', runSeed: (s?: number, u?: number) => ufrnApi.runImportAll(s, u) },
  { key: 'ufsm', label: 'UFSM', description: 'Importador UFSM (PDF)', runSeed: (s?: number, u?: number) => ufsmApi.runImportAll(s, u) },
  { key: 'ulbra', label: 'ULBRA', description: 'Importador ULBRA (PDF)', runSeed: (s?: number, u?: number) => ulbraApi.runImportAll(s, u) },
  { key: 'ufam', label: 'UFAM', description: 'Importador UFAM (PDF)', runSeed: (s?: number, u?: number) => ufamApi.runImportAll(s, u) },
  { key: 'puccampinas', label: 'PUCCAMPINAS', description: 'Importador PUCCAMPINAS (PDF)', runSeed: (s?: number, u?: number) => puccampinasApi.runImportAll(s, u) },
  { key: 'unimontes', label: 'UNIMONTES', description: 'Importador UNIMONTES (PDF)', runSeed: (s?: number, u?: number) => unimontesApi.runImportAll(s, u) },
  { key: 'unicentro', label: 'UNICENTRO', description: 'Importador UNICENTRO (PDF)', runSeed: (s?: number, u?: number) => unicentroApi.runImportAll(s, u) },
  { key: 'unaerp', label: 'UNAERP', description: 'Importador UNAERP (PDF)', runSeed: (s?: number, u?: number) => unaerpApi.runImportAll(s, u) },
]




function QuestionImportPanel() {
  const [running, setRunning] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, { ok: boolean; text: string }>>({})
  const [tasks, setTasks] = useState<Record<string, { current: number; total: number; items_done?: number | null; logs: {message: string}[]; status: string }>>({})
  const [sinceYear, setSinceYear] = useState<number | ''>('')
  const [untilYear, setUntilYear] = useState<number | ''>('')
  const [selectedKey, setSelectedKey] = useState<string>(IMPORT_SOURCES[0].key)
  const selected = IMPORT_SOURCES.find(s => s.key === selectedKey) ?? IMPORT_SOURCES[0]

  async function pollTask(srcKey: string, taskId: string) {
    const interval = setInterval(async () => {
      try {
        const r = await ownerApi.getTask(taskId)
        setTasks(prev => ({ ...prev, [srcKey]: r.data }))
        if (r.data.status === 'completed' || r.data.status === 'error') {
          clearInterval(interval)
          setRunning(null)
          if (r.data.status === 'completed') {
            const added = r.data.result?.total_added ?? 0
            setMessages(prev => ({
              ...prev,
              [srcKey]: { ok: true, text: added > 0 ? `✅ ${added} questões importadas!` : '✅ Concluído.' },
            }))
          } else {
            setMessages(prev => ({
              ...prev,
              [srcKey]: { ok: false, text: `❌ Erro: ${r.data.error}` },
            }))
          }
        }
      } catch {
        clearInterval(interval)
        setRunning(null)
        setMessages(prev => ({
          ...prev,
          [srcKey]: { ok: false, text: `❌ Conexão perdida. Verifique se o servidor reiniciou (OOM).` },
        }))
      }
    }, 1000)
  }

  async function handleImport(src: ImportSource) {
    setRunning(src.key)
    setMessages(prev => ({ ...prev, [src.key]: { ok: true, text: 'Iniciando importação...' } }))
    try {
      const s = sinceYear !== '' ? sinceYear : undefined
      const u = untilYear !== '' ? untilYear : undefined
      const r = await src.runSeed(s, u)
      // Alguns clients de API retornam o response inteiro do axios (r.data),
      // outros já retornam o payload desembrulhado (r é o próprio payload) —
      // aceita as duas formas em vez de assumir uma só (já foi bug: cliente
      // retornava payload puro, r.data vinha undefined e o catch mostrava
      // "Erro ao iniciar importação" mesmo com o backend funcionando).
      const payload = (r && typeof r === 'object' && 'data' in r) ? (r as any).data : r
      if (payload?.task_id) {
        setMessages(prev => ({ ...prev, [src.key]: { ok: true, text: 'Importação em background...' } }))
        pollTask(src.key, payload.task_id)
      } else {
        const added = (payload as { total_added?: number })?.total_added ?? 0
        setMessages(prev => ({
          ...prev,
          [src.key]: { ok: true, text: added > 0 ? `✅ ${added} questões importadas!` : '✅ Questões já estavam carregadas.' },
        }))
        setRunning(null)
      }
    } catch {
      setMessages(prev => ({ ...prev, [src.key]: { ok: false, text: '❌ Erro ao iniciar importação.' } }))
      setRunning(null)
    }
  }

  async function handleDelete(src: ImportSource) {
    if (!window.confirm(`Tem certeza que deseja remover as questões de ${src.label}? ${sinceYear || untilYear ? '(Atenção aos filtros de ano)' : '(TODAS as questões desta universidade)'}`)) return
    
    setRunning(src.key)
    setMessages(prev => ({ ...prev, [src.key]: { ok: true, text: 'Removendo...' } }))
    try {
      const s = sinceYear !== '' ? sinceYear : undefined
      const u = untilYear !== '' ? untilYear : undefined
      const r = await ownerApi.deleteQuestions(src.key, { since_year: s, until_year: u })
      setMessages(prev => ({ ...prev, [src.key]: { ok: true, text: `✅ ${r.data.message}` } }))
    } catch (e: any) {
      setMessages(prev => ({ ...prev, [src.key]: { ok: false, text: `❌ Erro: ${e.response?.data?.detail || e.message}` } }))
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
      <div className="mb-4">
        <h2 className="text-base font-bold text-[#1E293B]">Importação de Questões</h2>
        <p className="text-sm text-[#64748B]">
          Importação em massa de bancos de vestibulares para a plataforma. Exclusivo do proprietário do sistema.
          A operação é idempotente — rodar de novo não duplica questões já carregadas.
        </p>
      </div>

      <div className="max-w-xl">
        <label className="block text-xs font-semibold text-[#334155] mb-1.5">Universidade</label>
        <select
          value={selectedKey}
          onChange={e => setSelectedKey(e.target.value)}
          disabled={running !== null}
          className="w-full border border-[#c5c5d3] rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        >
          {IMPORT_SOURCES.map(src => (
            <option key={src.key} value={src.key}>{src.label}</option>
          ))}
        </select>
        <p className="text-xs text-[#64748B] mt-1.5">{selected.description}</p>

        <div className="mt-4 flex items-center gap-3">
          <div>
            <label className="block text-[10px] uppercase font-bold text-[#64748B] mb-1 tracking-wider">Ano Inicial</label>
            <input
              type="number"
              value={sinceYear}
              onChange={e => setSinceYear(e.target.value ? Number(e.target.value) : '')}
              className="w-28 border border-[#E2E8F0] rounded-md px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Ex: 2019"
            />
          </div>
          <span className="text-[#a0a3af] mt-5">-</span>
          <div>
            <label className="block text-[10px] uppercase font-bold text-[#64748B] mb-1 tracking-wider">Ano Final</label>
            <input
              type="number"
              value={untilYear}
              onChange={e => setUntilYear(e.target.value ? Number(e.target.value) : '')}
              className="w-28 border border-[#E2E8F0] rounded-md px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Ex: 2026"
            />
          </div>
        </div>
        <p className="text-xs text-[#9ca3af] mt-1">
          Limita a importação para provas dentro do intervalo especificado (depende de suporte no importador). Deixe em branco para importar tudo.
        </p>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => handleImport(selected)}
            disabled={running !== null}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-[#001a54] transition-colors disabled:opacity-50"
          >
            {running === selected.key ? 'Importando…' : 'Importar'}
          </button>
          <button
            onClick={() => handleDelete(selected)}
            disabled={running !== null}
            className="flex items-center justify-center px-3 py-2 rounded-lg border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
            title={`Remover questões de ${selected.label}`}
          >
            Remover
          </button>
        </div>

        {(() => {
          const task = tasks[selected.key]
          const msg = messages[selected.key]
          return (
            <>
              {task && task.status === 'running' && (
                <div className="mt-4">
                  <MiniBar value={task.current} max={task.total} color="bg-emerald-500" />
                  {task.items_done != null && (
                    <p className="mt-1 text-xs font-semibold text-[#1E293B]">
                      {task.items_done} questões importadas
                    </p>
                  )}
                  <div className="mt-2 text-xs text-[#64748B] max-h-40 overflow-y-auto space-y-1">
                    {[...task.logs].reverse().map((l, idx) => <p key={idx} className="truncate" title={l.message}>{l.message}</p>)}
                  </div>
                </div>
              )}
              {msg && (!task || task.status !== 'running') && (
                <p className={`mt-3 text-sm font-medium ${msg.ok ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {msg.text}
                </p>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}

function EnemPdfImportPanel() {
  const [prova, setProva] = useState<File | null>(null)
  const [gabarito, setGabarito] = useState<File | null>(null)
  const [provaUrl, setProvaUrl] = useState('')
  const [gabaritoUrl, setGabaritoUrl] = useState('')
  const [mecPageUrl, setMecPageUrl] = useState('https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos')
  const [year, setYear] = useState(new Date().getFullYear() - 1)
  const [day, setDay] = useState(1)
  const [color, setColor] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<EnemPdfImportResult | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!prova && !provaUrl.trim() && !mecPageUrl.trim()) {
      setError('Selecione o PDF da prova ou informe a URL da prova / página do MEC.')
      return
    }
    setError('')
    setResult(null)
    setSubmitting(true)
    try {
      const form = new FormData()
      if (prova) form.append('prova', prova)
      if (gabarito) form.append('gabarito', gabarito)
      if (provaUrl.trim()) form.append('prova_url', provaUrl.trim())
      if (gabaritoUrl.trim()) form.append('gabarito_url', gabaritoUrl.trim())
      if (mecPageUrl.trim()) form.append('mec_page_url', mecPageUrl.trim())
      form.append('year', String(year))
      form.append('day', String(day))
      if (color.trim()) form.append('color', color.trim())
      const r = await enemApi.importPdf(form)
      setResult(r.data)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err.response?.data?.detail ?? 'Erro ao importar PDF.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
      <div className="mb-4">
        <h2 className="text-base font-bold text-[#1E293B]">Importar prova ENEM (PDF ou URL do MEC)</h2>
        <p className="text-sm text-[#64748B]">
          Você pode enviar o PDF da prova ou informar a URL da prova ou a página oficial do MEC. A extração das questões usa reconhecimento de layout e uma IA (Groq) classifica matéria e dificuldade de cada questão.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <label className="text-xs font-semibold text-[#334155] sm:col-span-2">
          PDF da prova (opcional)
          <input
            type="file"
            accept="application/pdf"
            onChange={e => setProva(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-xs"
          />
        </label>
        <label className="text-xs font-semibold text-[#334155] sm:col-span-2">
          PDF do gabarito (opcional)
          <input
            type="file"
            accept="application/pdf"
            onChange={e => setGabarito(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-xs"
          />
        </label>
        <label className="text-xs font-semibold text-[#334155] sm:col-span-2">
          URL da prova (opcional)
          <input
            type="url"
            value={provaUrl}
            onChange={e => setProvaUrl(e.target.value)}
            placeholder="https://.../prova.pdf"
            className="mt-1 w-full border border-[#c5c5d3] rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-[#334155] sm:col-span-2">
          URL do gabarito (opcional)
          <input
            type="url"
            value={gabaritoUrl}
            onChange={e => setGabaritoUrl(e.target.value)}
            placeholder="https://.../gabarito.pdf"
            className="mt-1 w-full border border-[#c5c5d3] rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-[#334155] sm:col-span-4">
          Página do MEC (opcional)
          <input
            type="url"
            value={mecPageUrl}
            onChange={e => setMecPageUrl(e.target.value)}
            placeholder="https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos"
            className="mt-1 w-full border border-[#c5c5d3] rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-[#334155]">
          Ano
          <input
            type="number"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="mt-1 w-full border border-[#c5c5d3] rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-[#334155]">
          Dia
          <select
            value={day}
            onChange={e => setDay(Number(e.target.value))}
            className="mt-1 w-full border border-[#c5c5d3] rounded-lg px-2 py-1.5 text-sm"
          >
            <option value={1}>1º dia (Linguagens + Humanas)</option>
            <option value={2}>2º dia (Natureza + Matemática)</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-[#334155] sm:col-span-2">
          Cor do caderno (opcional — detectada automaticamente se possível)
          <input
            type="text"
            value={color}
            onChange={e => setColor(e.target.value)}
            placeholder="Ex.: Azul"
            className="mt-1 w-full border border-[#c5c5d3] rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-[#001a54] transition-colors disabled:opacity-50"
      >
        {submitting ? 'Importando… isso pode levar alguns minutos' : 'Importar PDF'}
      </button>
      {error && <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
      {result && (
        <div className="mt-3 text-sm text-[#1E293B] bg-[#EFF6FF] rounded-lg p-3">
          <p className="font-semibold">{result.exam_name}{result.color ? ` (${result.color})` : ''}</p>
          <p>{result.total_added} questões importadas · {result.skipped_existing} já existiam · {result.total_parsed} lidas do PDF.</p>
          {result.parse_errors.length > 0 && (
            <p className="text-amber-700 dark:text-amber-400 mt-1">
              Não foi possível extrair as alternativas das questões: {result.parse_errors.join(', ')}. Revise manualmente.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function UfscPdfImportPanel() {
  const [prova, setProva] = useState<File | null>(null)
  const [gabarito, setGabarito] = useState<File | null>(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [phase, setPhase] = useState('1')
  const [color, setColor] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<UfscPdfImportResult | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!prova) {
      setError('Selecione o PDF da prova.')
      return
    }
    setError('')
    setResult(null)
    setSubmitting(true)
    try {
      const form = new FormData()
      form.append('prova', prova)
      if (gabarito) form.append('gabarito', gabarito)
      form.append('year', String(year))
      form.append('phase', phase)
      if (color.trim()) form.append('color', color.trim())
      const r = await ufscApi.importPdf(form)
      setResult(r.data)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err.response?.data?.detail ?? 'Erro ao importar PDF.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
      <div className="mb-4">
        <h2 className="text-base font-bold text-[#1E293B]">Importar prova UFSC/IFSC/IFC (PDF)</h2>
        <p className="text-sm text-[#64748B]">
          Envie o PDF da prova (formato somatório) e, opcionalmente, o gabarito (PDF ou HTML).
          O gabarito em HTML é usado no formato de provas antigas e ainda não foi validado contra um arquivo real.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <label className="text-xs font-semibold text-[#334155]">
          PDF da prova
          <input
            type="file"
            accept="application/pdf"
            onChange={e => setProva(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-xs"
          />
        </label>
        <label className="text-xs font-semibold text-[#334155]">
          Gabarito (PDF ou HTML, opcional)
          <input
            type="file"
            accept="application/pdf,.html,.htm"
            onChange={e => setGabarito(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-xs"
          />
        </label>
        <label className="text-xs font-semibold text-[#334155]">
          Ano
          <input
            type="number"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="mt-1 w-full border border-[#c5c5d3] rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-[#334155]">
          Fase
          <select
            value={phase}
            onChange={e => setPhase(e.target.value)}
            className="mt-1 w-full border border-[#c5c5d3] rounded-lg px-2 py-1.5 text-sm"
          >
            <option value="1">Prova 1</option>
            <option value="2">Prova 2</option>
            <option value="3">Prova 3</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-[#334155] sm:col-span-2">
          Cor do caderno (opcional)
          <input
            type="text"
            value={color}
            onChange={e => setColor(e.target.value)}
            placeholder="Ex.: Amarela"
            className="mt-1 w-full border border-[#c5c5d3] rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-[#001a54] transition-colors disabled:opacity-50"
      >
        {submitting ? 'Importando… isso pode levar alguns minutos' : 'Importar PDF'}
      </button>
      {error && <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
      {result && (
        <div className="mt-3 text-sm text-[#1E293B] bg-[#EFF6FF] rounded-lg p-3">
          <p className="font-semibold">{result.exam_name}</p>
          <p>{result.total_added} questões importadas · {result.skipped_existing} já existiam · {result.total_parsed} lidas do PDF.</p>
        </div>
      )}
    </div>
  )
}


function ItaPdfImportPanel() {
  const [prova, setProva] = useState<File | null>(null)
  const [gabarito, setGabarito] = useState<File | null>(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [phase, setPhase] = useState('1')
  const [subject, setSubject] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ItaPdfImportResult | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!prova) {
      setError('Selecione o PDF da prova.')
      return
    }
    setError('')
    setResult(null)
    setSubmitting(true)
    try {
      const form = new FormData()
      form.append('prova', prova)
      if (gabarito) form.append('gabarito', gabarito)
      form.append('year', String(year))
      form.append('phase', phase)
      if (subject.trim()) form.append('subject', subject.trim())
      const r = await itaApi.importPdf(form)
      setResult(r.data)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err.response?.data?.detail ?? 'Erro ao importar PDF.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
      <div className="mb-4">
        <h2 className="text-base font-bold text-[#1E293B]">Importar prova ITA (PDF)</h2>
        <p className="text-sm text-[#64748B]">
          Envie o PDF da prova do ITA (1ª ou 2ª Fase) e, opcionalmente, o PDF de gabarito oficial para extração.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-4">
        <label className="text-xs font-semibold text-[#334155]">
          PDF da prova
          <input
            type="file"
            accept="application/pdf"
            onChange={e => setProva(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-xs"
          />
        </label>
        <label className="text-xs font-semibold text-[#334155]">
          PDF do Gabarito (opcional)
          <input
            type="file"
            accept="application/pdf"
            onChange={e => setGabarito(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-xs"
          />
        </label>
        <label className="text-xs font-semibold text-[#334155]">
          Ano
          <input
            type="number"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="mt-1 w-full border border-[#c5c5d3] rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-[#334155]">
          Fase
          <select
            value={phase}
            onChange={e => setPhase(e.target.value)}
            className="mt-1 w-full border border-[#c5c5d3] rounded-lg px-2 py-1.5 text-sm"
          >
            <option value="1">1ª Fase</option>
            <option value="2">2ª Fase</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-[#334155]">
          Matéria específica (opcional)
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Ex.: Física"
            className="mt-1 w-full border border-[#c5c5d3] rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-[#001a54] transition-colors disabled:opacity-50"
      >
        {submitting ? 'Importando… isso pode levar alguns minutos' : 'Importar PDF'}
      </button>
      {error && <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
      {result && (
        <div className="mt-3 text-sm text-[#1E293B] bg-[#EFF6FF] rounded-lg p-3">
          <p className="font-semibold">{result.exam_name}</p>
          <p>{result.total_added} questões importadas · {result.skipped_existing} já existiam · {result.total_parsed} lidas do PDF.</p>
        </div>
      )}
    </div>
  )
}

function AcafeUrlImportPanel() {
  const [url, setUrl] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [period, setPeriod] = useState('Verão')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<AcafeUrlImportResult | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!url.trim()) {
      setError('Informe a URL do PDF da prova.')
      return
    }
    setError('')
    setResult(null)
    setSubmitting(true)
    try {
      const r = await acafeApi.importUrl({ url: url.trim(), year, period: period || undefined })
      setResult(r.data)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err.response?.data?.detail ?? 'Erro ao importar PDF.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
      <div className="mb-4">
        <h2 className="text-base font-bold text-[#1E293B]">Importar prova ACAFE por URL</h2>
        <p className="text-sm text-[#64748B]">
          Cole a URL do PDF oficial "objetiva comentada" publicado em{' '}
          <a href="https://vestibular.acafe.org.br/provas-anteriores/" target="_blank" rel="noreferrer" className="text-amber-500 dark:text-teal-400 hover:underline">
            vestibular.acafe.org.br
          </a>
          {' '}(ex.: storage.acafe.org.br/concurso/vestibular/.../02 - prova/....pdf). O gabarito já vem embutido no PDF —
          não é preciso colar respostas à parte.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <label className="text-xs font-semibold text-[#334155] sm:col-span-2 lg:col-span-2">
          URL do PDF da prova
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://storage.acafe.org.br/.../Prova objetiva oficial - comentada.pdf"
            className="mt-1 w-full border border-[#c5c5d3] rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-[#334155]">
          Ano
          <input
            type="number"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="mt-1 w-full border border-[#c5c5d3] rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-[#334155]">
          Período
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="mt-1 w-full border border-[#c5c5d3] rounded-lg px-2 py-1.5 text-sm"
          >
            <option value="Verão">Verão</option>
            <option value="Inverno">Inverno</option>
          </select>
        </label>
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-[#001a54] transition-colors disabled:opacity-50"
      >
        {submitting ? 'Importando… isso pode levar alguns minutos' : 'Importar PDF'}
      </button>
      {error && <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
      {result && (
        <div className="mt-3 text-sm text-[#1E293B] bg-[#EFF6FF] rounded-lg p-3">
          <p className="font-semibold">{result.exam_name}</p>
          <p>{result.total_added} questões importadas · {result.skipped_existing} já existiam · {result.total_parsed} lidas do PDF.</p>
        </div>
      )}
    </div>
  )
}

function PucprUrlImportPanel() {
  const [url, setUrl] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [season, setSeason] = useState('Verão')
  const [course, setCourse] = useState('Demais Cursos')
  const [color, setColor] = useState('')
  const [gabaritoText, setGabaritoText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<PucprUrlImportResult | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!url.trim()) {
      setError('Informe a URL do PDF da prova.')
      return
    }
    setError('')
    setResult(null)
    setSubmitting(true)
    try {
      const r = await pucprApi.importUrl({
        url: url.trim(),
        year,
        season: season || undefined,
        course: course || undefined,
        color: color.trim() || undefined,
        gabarito_text: gabaritoText,
      })
      setResult(r.data)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      setError(err.response?.data?.detail ?? 'Erro ao importar PDF.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
      <div className="mb-4">
        <h2 className="text-base font-bold text-[#1E293B]">Importar prova PUCPR por URL</h2>
        <p className="text-sm text-[#64748B]">
          Cole a URL de um dos PDFs identificados como "Gabarito" em{' '}
          <a href="https://www.pucpr.br/vestibular/editais/" target="_blank" rel="noreferrer" className="text-amber-500 dark:text-teal-400 hover:underline">
            pucpr.br/vestibular/editais
          </a>
          {' '}(ex.: static.pucpr.br/.../gabarito-vestibular-....pdf). Atenção: esses PDFs são o caderno de prova
          completo, sem a resposta correta embutida — cole abaixo o texto do gabarito oficial (publicado
          separadamente) para que as respostas corretas sejam marcadas.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-3">
        <label className="text-xs font-semibold text-[#334155] sm:col-span-2 lg:col-span-4">
          URL do PDF da prova
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://static.pucpr.br/.../gabarito-vestibular-....pdf"
            className="mt-1 w-full border border-[#c5c5d3] rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-[#334155]">
          Ano
          <input
            type="number"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="mt-1 w-full border border-[#c5c5d3] rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-[#334155]">
          Período
          <select
            value={season}
            onChange={e => setSeason(e.target.value)}
            className="mt-1 w-full border border-[#c5c5d3] rounded-lg px-2 py-1.5 text-sm"
          >
            <option value="Verão">Verão</option>
            <option value="Inverno">Inverno</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-[#334155]">
          Curso
          <select
            value={course}
            onChange={e => setCourse(e.target.value)}
            className="mt-1 w-full border border-[#c5c5d3] rounded-lg px-2 py-1.5 text-sm"
          >
            <option value="Demais Cursos">Demais Cursos</option>
            <option value="Medicina">Medicina</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-[#334155]">
          Cor da prova (opcional)
          <input
            type="text"
            value={color}
            onChange={e => setColor(e.target.value)}
            placeholder="Ex.: Amarela"
            className="mt-1 w-full border border-[#c5c5d3] rounded-lg px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <label className="text-xs font-semibold text-[#334155] block mb-4">
        Gabarito oficial (cole o texto — ex.: "01-B 02-D 03-C..." ou uma lista número/letra)
        <textarea
          value={gabaritoText}
          onChange={e => setGabaritoText(e.target.value)}
          rows={4}
          placeholder="01 B&#10;02 D&#10;03 C&#10;..."
          className="mt-1 w-full border border-[#c5c5d3] rounded-lg px-2 py-1.5 text-sm font-mono"
        />
      </label>
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-[#001a54] transition-colors disabled:opacity-50"
      >
        {submitting ? 'Importando… isso pode levar alguns minutos' : 'Importar PDF'}
      </button>
      {error && <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
      {result && (
        <div className="mt-3 text-sm text-[#1E293B] bg-[#EFF6FF] rounded-lg p-3">
          <p className="font-semibold">{result.exam_name}</p>
          <p>
            {result.total_added} questões importadas · {result.skipped_existing} já existiam ·{' '}
            {result.total_parsed} lidas do PDF · {result.gabarito_entries} respostas no gabarito colado.
          </p>
          {result.skipped_unparsed.length > 0 && (
            <p className="text-amber-700 dark:text-amber-400 mt-1">
              Não foi possível extrair as alternativas de algumas questões (comum em questões de Matemática/Física
              com fórmulas): {result.skipped_unparsed.join(', ')}. Revise manualmente.
            </p>
          )}
        </div>
      )}
    </div>
  )
}


export default function OwnerImportersPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F9] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Importadores e Banco</h1>
          <p className="text-sm text-[#64748B] mt-1">Gerencie a carga de questões e provas no banco de dados.</p>
        </div>
        <QuestionImportPanel />
        <EnemPdfImportPanel />
        <UfscPdfImportPanel />
        <ItaPdfImportPanel />
        <AcafeUrlImportPanel />
        <PucprUrlImportPanel />
      </div>
    </div>
  )
}
