import { MiniBar } from './OwnerPage'
import { useState, useEffect } from 'react'
import {
  enemApi, acafeApi, ufprApi, ufscApi, itaApi, uerjApi, ufgdApi, uemApi, ufmsApi, fuvestApi,
  pucrioApi, udescApi, unespApi, cebraspeApi, unifespApi, espmApi, fgvApi, pucprApi, pucrsApi,
  ufpelApi, ufrgsApi, unicampApi, ufgApi, ufjfApi, ufuApi, ufpaApi, utfprApi, unioesteApi,
  uelApi, pucminasApi, ufrnApi, ufsmApi, ulbraApi, ufamApi,
  puccampinasApi, unimontesApi, unicentroApi, unaerpApi,
  ownerApi
} from '../api'
import { uploadPdfApi, type UploadPdfResult } from '../api/uploadPdf'

type ImportSource = {
  key: string
  label: string
  description: string
  runSeed: (since_year?: number, until_year?: number, forceReimport?: boolean, examName?: string) => Promise<any>
}

const IMPORT_SOURCES: ImportSource[] = [
  { key: 'enem', label: 'ENEM', description: 'Varredura ENEM no site do INEP (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => enemApi.runImportAll(s, u, fr, en) },
  { key: 'acafe', label: 'ACAFE', description: 'Vestibular ACAFE — Santa Catarina (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => acafeApi.runSeed(s, u, fr, en) },
  { key: 'ufpr', label: 'UFPR', description: 'UFPR — Ano a ano via Brasil Escola (um PDF por ano). Preencha Ano Inicial e Ano Final para importar só o intervalo desejado (ex: 2023–2023 para um único ano).', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => ufprApi.runImportAll(s, u, fr, en) },
  { key: 'ufsc', label: 'UFSC', description: 'Vestibular UFSC/IFSC/IFC — varredura online (vestibularunificado2025.ufsc.br). Preencha Ano Inicial E Ano Final (ex: 2020–2020) para evitar OOM no plano free.', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => ufscApi.runImportAll(s, u, fr, en) },
  { key: 'ita', label: 'ITA', description: 'Varredura automática do site do ITA (2019-2026) (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => itaApi.runImportAll(s, u, fr, en) },
  { key: 'uerj', label: 'UERJ', description: 'Importador UERJ (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => uerjApi.runImportAll(s, u, fr, en) },
  { key: 'ufgd', label: 'UFGD', description: 'Importador UFGD (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => ufgdApi.runImportAll(s, u, fr, en) },
  { key: 'uem', label: 'UEM', description: 'Importador UEM (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => uemApi.runImportAll(s, u, fr, en) },
  { key: 'ufms', label: 'UFMS', description: 'Importador UFMS (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => ufmsApi.runImportAll(s, u, fr, en) },
  { key: 'fuvest', label: 'FUVEST', description: 'Importador USP/FUVEST (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => fuvestApi.runImportAll(s, u, fr, en) },
  { key: 'pucrio', label: 'PUC-Rio', description: 'Importador PUC-Rio (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => pucrioApi.runImportAll(s, u, fr, en) },
  { key: 'udesc', label: 'UDESC', description: 'Importador UDESC (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => udescApi.runImportAll(s, u, fr, en) },
  { key: 'unesp', label: 'UNESP', description: 'Importador UNESP (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => unespApi.runSeed(s, u, fr, en) },
  { key: 'cebraspe', label: 'UnB/CEBRASPE', description: 'Importador UnB/CEBRASPE (PDF) - Certo/Errado', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => cebraspeApi.runSeed(s, u, fr, en) },
  { key: 'unifesp', label: 'UNIFESP', description: 'Importador UNIFESP (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => unifespApi.runSeed(s, u, fr, en) },
  { key: 'espm', label: 'ESPM', description: 'Importador ESPM (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => espmApi.runImportAll(s, u, fr, en) },
  { key: 'fgv', label: 'FGV', description: 'Importador FGV (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => fgvApi.runImportAll(s, u, fr, en) },
  { key: 'pucpr', label: 'PUCPR', description: 'Importador PUCPR (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => pucprApi.runImportAll(s, u, fr, en) },
  { key: 'pucrs', label: 'PUCRS', description: 'Importador PUCRS (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => pucrsApi.runImportAll(s, u, fr, en) },
  { key: 'ufpel', label: 'UFPEL', description: 'Importador UFPEL (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => ufpelApi.runImportAll(s, u, fr, en) },
  { key: 'ufrgs', label: 'UFRGS', description: 'Importador UFRGS (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => ufrgsApi.runImportAll(s, u, fr, en) },
  { key: 'unicamp', label: 'UNICAMP', description: 'Importador UNICAMP (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => unicampApi.runImportAll(s, u, fr, en) },
  { key: 'ufg', label: 'UFG', description: 'Importador UFG (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => ufgApi.runImportAll(s, u, fr, en) },
  { key: 'ufjf', label: 'UFJF', description: 'Importador UFJF (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => ufjfApi.runImportAll(s, u, fr, en) },
  { key: 'ufu', label: 'UFU', description: 'Importador UFU (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => ufuApi.runImportAll(s, u, fr, en) },
  { key: 'ufpa', label: 'UFPA', description: 'Importador UFPA (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => ufpaApi.runImportAll(s, u, fr, en) },
  { key: 'utfpr', label: 'UTFPR', description: 'Importador UTFPR (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => utfprApi.runImportAll(s, u, fr, en) },
  { key: 'unioeste', label: 'UNIOESTE', description: 'Importador UNIOESTE (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => unioesteApi.runImportAll(s, u, fr, en) },
  { key: 'uel', label: 'UEL', description: 'Importador UEL (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => uelApi.runImportAll(s, u, fr, en) },
  { key: 'pucminas', label: 'PUCMINAS', description: 'Importador PUCMINAS (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => pucminasApi.runImportAll(s, u, fr, en) },
  { key: 'ufrn', label: 'UFRN', description: 'Importador UFRN (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => ufrnApi.runImportAll(s, u, fr, en) },
  { key: 'ufsm', label: 'UFSM', description: 'Importador UFSM (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => ufsmApi.runImportAll(s, u, fr, en) },
  { key: 'ulbra', label: 'ULBRA', description: 'Importador ULBRA (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => ulbraApi.runImportAll(s, u, fr, en) },
  { key: 'ufam', label: 'UFAM', description: 'Importador UFAM (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => ufamApi.runImportAll(s, u, fr, en) },
  { key: 'puccampinas', label: 'PUCCAMPINAS', description: 'Importador PUCCAMPINAS (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => puccampinasApi.runImportAll(s, u, fr, en) },
  { key: 'unimontes', label: 'UNIMONTES', description: 'Importador UNIMONTES (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => unimontesApi.runImportAll(s, u, fr, en) },
  { key: 'unicentro', label: 'UNICENTRO', description: 'Importador UNICENTRO (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => unicentroApi.runImportAll(s, u, fr, en) },
  { key: 'unaerp', label: 'UNAERP', description: 'Importador UNAERP (PDF)', runSeed: (s?: number, u?: number, fr?: boolean, en?: string) => unaerpApi.runImportAll(s, u, fr, en) },
]




function QuestionImportPanel() {
  const [running, setRunning] = useState<string | null>(null)
  const [messages, setMessages] = useState<Record<string, { ok: boolean; text: string }>>({})
  const [tasks, setTasks] = useState<Record<string, { current: number; total: number; items_done?: number | null; logs: {message: string}[]; status: string }>>({})
  const [sinceYear, setSinceYear] = useState<number | ''>('')
  const [untilYear, setUntilYear] = useState<number | ''>('')
  const [forceReimport, setForceReimport] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string>(IMPORT_SOURCES[0].key)
  const [examVersions, setExamVersions] = useState<string[]>([])
  const [selectedExamName, setSelectedExamName] = useState<string>('')
  const [supportsVersions, setSupportsVersions] = useState(false)
  const selected = IMPORT_SOURCES.find(s => s.key === selectedKey) ?? IMPORT_SOURCES[0]

  // Fetch exam versions when university or year selection changes
  useEffect(() => {
    setSelectedExamName('')
    setExamVersions([])
    const apiMap: Record<string, { getExamVersions?: (year?: number) => Promise<any> }> = {
      enem: enemApi, acafe: acafeApi, ufpr: ufprApi, ufsc: ufscApi, ita: itaApi,
      uerj: uerjApi, ufgd: ufgdApi, uem: uemApi, ufms: ufmsApi, fuvest: fuvestApi,
      pucrio: pucrioApi, udesc: udescApi, unesp: unespApi, cebraspe: cebraspeApi,
      unifesp: unifespApi, espm: espmApi, fgv: fgvApi, pucpr: pucprApi, pucrs: pucrsApi,
      ufpel: ufpelApi, ufrgs: ufrgsApi, unicamp: unicampApi, ufg: ufgApi, ufjf: ufjfApi,
      ufu: ufuApi, ufpa: ufpaApi, utfpr: utfprApi, unioeste: unioesteApi, uel: uelApi,
      pucminas: pucminasApi, ufrn: ufrnApi, ufsm: ufsmApi, ulbra: ulbraApi, ufam: ufamApi,
      puccampinas: puccampinasApi, unimontes: unimontesApi, unicentro: unicentroApi, unaerp: unaerpApi,
    }
    const apiObj = apiMap[selectedKey]
    setSupportsVersions(!!apiObj?.getExamVersions)
    if (apiObj?.getExamVersions) {
      const yearParam = sinceYear !== '' ? Number(sinceYear) : undefined
      apiObj.getExamVersions(yearParam).then(r => {
        const versions = (r && typeof r === 'object' && 'data' in r) ? (r as any).data : r
        if (Array.isArray(versions)) setExamVersions(versions)
      }).catch(() => {})
    }
  }, [selectedKey, sinceYear])


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
      const r = await src.runSeed(s, u, forceReimport, selectedExamName || undefined)
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

        {supportsVersions && (
          <div className="mt-3">
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">Versão da prova</label>
            <select
              value={selectedExamName}
              onChange={e => setSelectedExamName(e.target.value)}
              className="w-full rounded-lg border border-[#475569] bg-[#1e293b] px-3 py-2 text-sm text-[#e2e8f0] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              disabled={examVersions.length === 0}
            >
              <option value="">{examVersions.length === 0 ? 'Nenhuma versão disponível para este ano' : 'Todas as versões'}</option>
              {examVersions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <p className="text-xs text-[#9ca3af] mt-1">
              {examVersions.length === 0
                ? 'Nenhuma versão encontrada no banco para o ano selecionado. A importação buscará todas as versões disponíveis.'
                : 'Selecione uma versão específica para importar apenas essa edição.'}
            </p>
          </div>
        )}


        <label className="mt-3 flex items-center gap-2 text-sm text-[#cbd5e1] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={forceReimport}
            onChange={e => setForceReimport(e.target.checked)}
            className="rounded border-[#475569] bg-[#1e293b] text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
          />
          Forçar reimportação (apaga questões existentes antes de importar)
        </label>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => handleImport(selected)}
            disabled={running !== null}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-600 text-white text-sm font-semibold hover:bg-[#001a54] transition-colors disabled:opacity-50"
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

const PDF_UPLOAD_VESTIBULARES = [
  { key: 'enem', label: 'ENEM' },
  { key: 'acafe', label: 'ACAFE' },
  { key: 'ufpr', label: 'UFPR' },
  { key: 'ufsc', label: 'UFSC' },
  { key: 'ita', label: 'ITA' },
  { key: 'uerj', label: 'UERJ' },
  { key: 'ufgd', label: 'UFGD' },
  { key: 'uem', label: 'UEM' },
  { key: 'ufms', label: 'UFMS' },
  { key: 'fuvest', label: 'FUVEST' },
  { key: 'pucrio', label: 'PUC-Rio' },
  { key: 'udesc', label: 'UDESC' },
  { key: 'unesp', label: 'UNESP' },
  { key: 'cebraspe', label: 'UnB/CEBRASPE' },
  { key: 'unifesp', label: 'UNIFESP' },
  { key: 'espm', label: 'ESPM' },
  { key: 'fgv', label: 'FGV' },
  { key: 'pucpr', label: 'PUCPR' },
  { key: 'pucrs', label: 'PUCRS' },
  { key: 'ufpel', label: 'UFPEL' },
  { key: 'ufrgs', label: 'UFRGS' },
  { key: 'unicamp', label: 'UNICAMP' },
  { key: 'ufg', label: 'UFG' },
  { key: 'ufjf', label: 'UFJF' },
  { key: 'ufu', label: 'UFU' },
  { key: 'ufpa', label: 'UFPA' },
  { key: 'utfpr', label: 'UTFPR' },
  { key: 'unioeste', label: 'UNIOESTE' },
  { key: 'uel', label: 'UEL' },
  { key: 'pucminas', label: 'PUCMINAS' },
  { key: 'ufrn', label: 'UFRN' },
  { key: 'ufsm', label: 'UFSM' },
  { key: 'ulbra', label: 'ULBRA' },
  { key: 'ufam', label: 'UFAM' },
  { key: 'puccampinas', label: 'PUCCAMPINAS' },
  { key: 'unimontes', label: 'UNIMONTES' },
  { key: 'unicentro', label: 'UNICENTRO' },
  { key: 'unaerp', label: 'UNAERP' },
]

function GenericPdfUploadPanel() {
  const [examType, setExamType] = useState(PDF_UPLOAD_VESTIBULARES[0].key)
  const [prova, setProva] = useState<File | null>(null)
  const [gabarito, setGabarito] = useState<File | null>(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [forceReimport, setForceReimport] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<UploadPdfResult | null>(null)
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
      form.append('exam_type', examType)
      form.append('prova', prova)
      if (gabarito) form.append('gabarito', gabarito)
      form.append('year', String(year))
      if (forceReimport) form.append('force_reimport', 'true')
      const r = await uploadPdfApi.upload(form)
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
        <h2 className="text-base font-bold text-[#1E293B]">Importar prova via PDF</h2>
        <p className="text-sm text-[#64748B]">
          Envie o PDF da prova e, opcionalmente, o gabarito. Selecione o vestibular e o ano correspondente.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <label className="text-xs font-semibold text-[#334155]">
          Vestibular
          <select
            value={examType}
            onChange={e => setExamType(e.target.value)}
            className="mt-1 w-full border border-[#c5c5d3] rounded-lg px-2 py-1.5 text-sm"
          >
            {PDF_UPLOAD_VESTIBULARES.map(v => (
              <option key={v.key} value={v.key}>{v.label}</option>
            ))}
          </select>
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
          PDF da prova
          <input
            type="file"
            accept="application/pdf"
            onChange={e => setProva(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-xs"
          />
        </label>
        <label className="text-xs font-semibold text-[#334155]">
          Gabarito (opcional)
          <input
            type="file"
            accept="application/pdf,.html,.htm"
            onChange={e => setGabarito(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-xs"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-[#334155] mb-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={forceReimport}
          onChange={e => setForceReimport(e.target.checked)}
          className="rounded border-[#c5c5d3] text-blue-600 focus:ring-blue-500"
        />
        Forçar reimportação (apaga questões existentes antes de importar)
      </label>
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="px-4 py-2 rounded-lg bg-slate-600 text-white text-sm font-semibold hover:bg-[#001a54] transition-colors disabled:opacity-50"
      >
        {submitting ? 'Importando… isso pode levar alguns minutos' : 'Importar PDF'}
      </button>
      {error && <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
      {result && (
        <div className="mt-3 text-sm text-[#1E293B] bg-[#EFF6FF] rounded-lg p-3">
          <p className="font-semibold">{result.exam_name ?? result.exam_type}</p>
          <p>
            {result.total_added ?? 0} questões importadas · {result.skipped_existing ?? 0} já existiam · {result.total_parsed ?? 0} lidas do PDF.
          </p>
          {(result.parse_errors?.length ?? 0) > 0 && (
            <p className="text-slate-700 dark:text-slate-400 mt-1">
              Não foi possível extrair as alternativas das questões: {result.parse_errors!.join(', ')}. Revise manualmente.
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
        <GenericPdfUploadPanel />
      </div>
    </div>
  )
}
