import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mindmapsApi, type MindMap } from '../api/mindmaps'
import ConfirmDialog from '../components/ConfirmDialog'

export default function MindMapsListPage() {
  const navigate = useNavigate()
  const [maps, setMaps] = useState<MindMap[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  useEffect(() => {
    mindmapsApi.list()
      .then(r => setMaps(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async () => {
    if (!deleteId) return
    await mindmapsApi.delete(deleteId)
    setMaps(maps.filter(m => m.id !== deleteId))
    setDeleteId(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg className="w-8 h-8 animate-spin text-slate-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B] dark:text-[#F8FAFC]">Meus Mapas Mentais</h1>
          <p className="text-sm text-[#64748B] dark:text-slate-400 mt-1">Organize seus estudos com mapas visuais</p>
        </div>
        <button
          onClick={() => navigate('/mindmaps/novo')}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #475569 0%, #64748b 100%)' }}
        >
          + Novo mapa
        </button>
      </div>

      {maps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#c5ceff] dark:border-[#464554] p-16 text-center">
          <svg className="w-12 h-12 text-[#c5ceff] dark:text-[#3d3470] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-base font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1">Nenhum mapa mental ainda</p>
          <p className="text-sm text-[#64748B] dark:text-slate-400">Crie seu primeiro mapa para organizar seus estudos.</p>
          <button
            onClick={() => navigate('/mindmaps/novo')}
            className="mt-6 px-6 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #475569 0%, #64748b 100%)' }}
          >
            Criar meu primeiro mapa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {maps.map(map => (
            <div
              key={map.id}
              className="bg-white dark:bg-[#1d1f27] rounded-xl border border-[#E2E8F0] dark:border-[#464554] p-5 hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => navigate(`/mindmaps/${map.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-400 to-pink-500">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteId(map.id) }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <h3 className="font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-1 truncate">{map.title}</h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                {map.data.nodes.length} nó{map.data.nodes.length !== 1 ? 's' : ''} · Atualizado {new Date(map.updated_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Excluir mapa mental"
        message="Tem certeza que deseja excluir este mapa mental? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}