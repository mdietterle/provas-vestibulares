import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { mindmapsApi, type MindMapData, type MindMapNode } from '../api/mindmaps'

const BRANCH_COLORS = {
  top: '#f97316',    // orange
  right: '#3b82f6',  // blue
  bottom: '#10b981', // green
  left: '#ec4899',   // pink
}

const COLOR_PALETTE = [
  '#f97316', '#ec4899', '#8b5cf6', '#3b82f6',
  '#10b981', '#eab308', '#ef4444', '#06b6d4',
  '#6366f1', '#14b8a6', '#f59e0b', '#84cc16',
]

function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

function getBranchColor(angle: number): string {
  const deg = ((angle * 180 / Math.PI) + 360) % 360
  if (deg >= 315 || deg < 45) return BRANCH_COLORS.right
  if (deg >= 45 && deg < 135) return BRANCH_COLORS.bottom
  if (deg >= 135 && deg < 225) return BRANCH_COLORS.left
  return BRANCH_COLORS.top
}

function getAllDescendants(nodeId: string, connections: Array<{ from: string; to: string }>): string[] {
  const result: string[] = []
  const queue = [nodeId]
  while (queue.length > 0) {
    const current = queue.shift()!
    const children = connections.filter(c => c.from === current).map(c => c.to)
    for (const child of children) {
      if (!result.includes(child)) {
        result.push(child)
        queue.push(child)
      }
    }
  }
  return result
}

function getChildCount(nodeId: string, connections: Array<{ from: string; to: string }>): number {
  return connections.filter(c => c.from === nodeId).length
}

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1
  const dy = y2 - y1
  const cx1 = x1 + dx * 0.5
  const cy1 = y1
  const cx2 = x2 - dx * 0.5
  const cy2 = y2
  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`
}

export default function MindMapEditorPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id

  const [title, setTitle] = useState('Novo Mapa Mental')
  const [nodes, setNodes] = useState<MindMapNode[]>([
    { id: 'root', text: 'Ideia Central', x: 500, y: 400, color: '#f97316', type: 'box' }
  ])
  const [connections, setConnections] = useState<Array<{ from: string; to: string }>>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [showTypeSelector, setShowTypeSelector] = useState(false)
  const [pendingParentId, setPendingParentId] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)
  const dragOffset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!isEdit) return
    mindmapsApi.get(Number(id))
      .then(r => {
        setTitle(r.data.title)
        setNodes(r.data.data.nodes.map(n => ({ ...n, type: n.type || 'box' })))
        setConnections(r.data.data.connections)
      })
      .catch(() => navigate('/mindmaps'))
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate])

  const handleSave = async () => {
    setSaving(true)
    const data: MindMapData = { nodes, connections }
    try {
      if (isEdit) {
        await mindmapsApi.update(Number(id), { title, data })
      } else {
        await mindmapsApi.create(title, data)
      }
      navigate('/mindmaps')
    } catch (err) {
      alert('Erro ao salvar mapa mental')
    } finally {
      setSaving(false)
    }
  }

  const requestAddNode = useCallback((parentId?: string) => {
    setPendingParentId(parentId)
    setShowTypeSelector(true)
  }, [])

  const confirmAddNode = useCallback((type: 'box' | 'text') => {
    setShowTypeSelector(false)
    const parentId = pendingParentId
    const parent = parentId ? nodes.find(n => n.id === parentId) : nodes[0]
    const existingChildren = connections.filter(c => c.from === (parentId || 'root')).length
    const angle = (existingChildren * Math.PI * 2) / 6 + Math.random() * 0.5
    const distance = 180 + Math.random() * 80
    const newX = (parent?.x ?? 500) + Math.cos(angle) * distance
    const newY = (parent?.y ?? 400) + Math.sin(angle) * distance
    const newNode: MindMapNode = {
      id: generateId(),
      text: type === 'text' ? 'Texto' : 'Novo nó',
      x: newX,
      y: newY,
      color: parentId
        ? nodes.find(n => n.id === parentId)?.color
        : getBranchColor(Math.atan2(newY - (parent?.y ?? 400), newX - (parent?.x ?? 500))),
      parent_id: parentId,
      type,
    }
    setNodes(prev => [...prev, newNode])
    if (parentId) {
      setConnections(prev => [...prev, { from: parentId, to: newNode.id }])
    }
    setSelectedNode(newNode.id)
    setPendingParentId(undefined)
  }, [nodes, connections, pendingParentId])

  const deleteNode = useCallback((nodeId: string) => {
    if (nodeId === 'root') return
    setNodes(nodes.filter(n => n.id !== nodeId))
    setConnections(connections.filter(c => c.from !== nodeId && c.to !== nodeId))
    if (selectedNode === nodeId) setSelectedNode(null)
  }, [nodes, connections, selectedNode])

  const updateNodeText = useCallback((nodeId: string, text: string) => {
    setNodes(nodes.map(n => n.id === nodeId ? { ...n, text } : n))
  }, [nodes])

  const changeNodeColor = useCallback((nodeId: string, color: string) => {
    const descendants = getAllDescendants(nodeId, connections)
    const idsToUpdate = new Set([nodeId, ...descendants])
    setNodes(nodes.map(n => idsToUpdate.has(n.id) ? { ...n, color } : n))
  }, [nodes, connections])

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    const node = nodes.find(n => n.id === nodeId)
    if (!node || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    dragOffset.current = {
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y,
    }
    setDraggingNode(nodeId)
    setSelectedNode(nodeId)
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingNode || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - dragOffset.current.x
    const y = e.clientY - rect.top - dragOffset.current.y
    setNodes(nodes.map(n => n.id === draggingNode ? { ...n, x, y } : n))
  }, [draggingNode, nodes])

  const handleMouseUp = useCallback(() => {
    setDraggingNode(null)
  }, [])

  const handleConnectStart = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    setConnectingFrom(nodeId)
  }

  const handleConnectEnd = (nodeId: string) => {
    if (connectingFrom && connectingFrom !== nodeId) {
      const exists = connections.some(c =>
        (c.from === connectingFrom && c.to === nodeId) ||
        (c.from === nodeId && c.to === connectingFrom)
      )
      if (!exists) {
        setConnections([...connections, { from: connectingFrom, to: nodeId }])
      }
    }
    setConnectingFrom(null)
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
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => navigate('/mindmaps')}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#EFF6FF] dark:hover:bg-slate-800 transition-colors"
        >
          <svg className="w-4 h-4 text-[#334155] dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 text-2xl font-bold text-[#1E293B] dark:text-[#F8FAFC] bg-transparent border-none focus:outline-none focus:ring-0"
          placeholder="Título do mapa mental"
        />
        <button
          onClick={() => requestAddNode()}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          + Nó
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #475569 0%, #64748b 100%)' }}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#1d1f27] dark:to-[#16181f] rounded-xl border border-[#E2E8F0] dark:border-[#464554] overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => setSelectedNode(null)}
      >
        {/* SVG for bezier connections with dynamic thickness */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {connections.map((conn, i) => {
            const fromNode = nodes.find(n => n.id === conn.from)
            const toNode = nodes.find(n => n.id === conn.to)
            if (!fromNode || !toNode) return null
            const childCount = getChildCount(conn.to, connections)
            const strokeWidth = Math.min(3 + childCount * 1.5, 12)
            return (
              <path
                key={i}
                d={bezierPath(fromNode.x, fromNode.y, toNode.x, toNode.y)}
                stroke={fromNode.color || '#94a3b8'}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                opacity="0.7"
              />
            )
          })}
        </svg>

        {/* Nodes */}
        {nodes.map(node => {
          const isText = node.type === 'text'
          return (
            <div
              key={node.id}
              className={`absolute group ${selectedNode === node.id ? 'z-20' : 'z-10'}`}
              style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
              onMouseDown={(e) => handleMouseDown(e, node.id)}
              onMouseUp={() => handleConnectEnd(node.id)}
            >
              {isText ? (
                /* Text-only node */
                <div
                  className={`relative px-3 py-1.5 cursor-move transition-all ${
                    selectedNode === node.id ? 'scale-105' : 'hover:scale-105'
                  }`}
                >
                  {selectedNode === node.id ? (
                    <input
                      type="text"
                      value={node.text}
                      onChange={(e) => updateNodeText(node.id, e.target.value)}
                      className="bg-transparent font-semibold text-sm focus:outline-none min-w-[80px] text-center border-b-2 pb-0.5"
                      style={{ color: node.color || '#f97316', borderColor: node.color || '#f97316' }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className="font-semibold text-sm whitespace-nowrap"
                      style={{ color: node.color || '#f97316' }}
                    >
                      {node.text}
                    </span>
                  )}

                  {/* Connection handle */}
                  <div
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 opacity-0 group-hover:opacity-100 cursor-crosshair transition-opacity shadow"
                    style={{ borderColor: node.color || '#f97316' }}
                    onMouseDown={(e) => handleConnectStart(e, node.id)}
                    onClick={(e) => e.stopPropagation()}
                  />

                  {/* Action buttons for text node */}
                  {selectedNode === node.id && (
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex gap-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); requestAddNode(node.id) }}
                        className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 shadow-lg"
                        title="Adicionar filho"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      {node.id !== 'root' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNode(node.id) }}
                          className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-lg"
                          title="Excluir"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Color picker for text node */}
                  {selectedNode === node.id && (
                    <div
                      className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-1 bg-white dark:bg-[#1d1f27] p-1.5 rounded-lg shadow-xl border border-[#E2E8F0] dark:border-[#464554]"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {COLOR_PALETTE.map(color => (
                        <button
                          key={color}
                          onClick={(e) => { e.stopPropagation(); changeNodeColor(node.id, color) }}
                          className={`w-4 h-4 rounded-full transition-transform hover:scale-125 ${node.color === color ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''}`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Box node */
                <div
                  className={`relative px-5 py-3 rounded-2xl shadow-xl cursor-move transition-all ${
                    selectedNode === node.id ? 'ring-4 ring-offset-2 scale-105' : 'hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: node.color || '#f97316',
                    boxShadow: `0 8px 24px ${node.color || '#f97316'}40`,
                    ringColor: node.color || '#f97316',
                  }}
                >
                  {selectedNode === node.id ? (
                    <input
                      type="text"
                      value={node.text}
                      onChange={(e) => updateNodeText(node.id, e.target.value)}
                      className="bg-transparent text-white font-bold text-base focus:outline-none min-w-[120px] text-center"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-white font-bold text-base whitespace-nowrap drop-shadow-md">
                      {node.text}
                    </span>
                  )}

                  {/* Connection handle */}
                  <div
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-3 opacity-0 group-hover:opacity-100 cursor-crosshair transition-opacity shadow-lg"
                    style={{ borderColor: node.color || '#f97316' }}
                    onMouseDown={(e) => handleConnectStart(e, node.id)}
                    onClick={(e) => e.stopPropagation()}
                  />

                  {/* Action buttons for box node */}
                  {selectedNode === node.id && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); requestAddNode(node.id) }}
                        className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 shadow-lg"
                        title="Adicionar filho"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      {node.id !== 'root' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNode(node.id) }}
                          className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-lg"
                          title="Excluir"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Color picker for box node */}
                  {selectedNode === node.id && (
                    <div
                      className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-1.5 bg-white dark:bg-[#1d1f27] p-2 rounded-xl shadow-xl border border-[#E2E8F0] dark:border-[#464554]"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {COLOR_PALETTE.map(color => (
                        <button
                          key={color}
                          onClick={(e) => { e.stopPropagation(); changeNodeColor(node.id, color) }}
                          className={`w-5 h-5 rounded-full transition-transform hover:scale-125 ${node.color === color ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''}`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Empty state hint */}
        {nodes.length === 1 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-[#64748B] dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 px-4 py-2 rounded-lg">
              Clique em "+ Nó" para adicionar ou arraste os nós para organizar
            </p>
          </div>
        )}
      </div>

      {/* Node type selector modal */}
      {showTypeSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowTypeSelector(false)} />
          <div className="relative bg-white dark:bg-[#1d1f27] border border-[#E2E8F0] dark:border-[#464554] rounded-2xl shadow-2xl p-6 max-w-xs w-full">
            <h3 className="text-lg font-bold text-[#1E293B] dark:text-[#F8FAFC] mb-4 text-center">Tipo de nó</h3>
            <div className="flex gap-3">
              <button
                onClick={() => confirmAddNode('box')}
                className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-[#E2E8F0] dark:border-[#464554] hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
              >
                <div className="w-12 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">Box</span>
                </div>
                <span className="text-sm font-semibold text-[#1E293B] dark:text-[#F8FAFC]">Caixa</span>
                <span className="text-xs text-[#64748B] dark:text-slate-400">Nó com fundo colorido</span>
              </button>
              <button
                onClick={() => confirmAddNode('text')}
                className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-[#E2E8F0] dark:border-[#464554] hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
              >
                <div className="w-12 h-8 flex items-center justify-center">
                  <span className="text-orange-500 text-sm font-bold border-b-2 border-orange-500">Texto</span>
                </div>
                <span className="text-sm font-semibold text-[#1E293B] dark:text-[#F8FAFC]">Texto</span>
                <span className="text-xs text-[#64748B] dark:text-slate-400">Apenas texto colorido</span>
              </button>
            </div>
            <button
              onClick={() => setShowTypeSelector(false)}
              className="mt-4 w-full text-sm text-[#64748B] dark:text-slate-400 hover:text-[#1E293B] dark:hover:text-[#F8FAFC] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 text-xs text-[#64748B] dark:text-slate-400 space-y-1 bg-white dark:bg-[#1d1f27] p-3 rounded-lg border border-[#E2E8F0] dark:border-[#464554]">
        <p className="font-semibold mb-2">Como usar:</p>
        <p>• Arraste os nós para reposicionar no canvas</p>
        <p>• Passe o mouse sobre um nó e clique no círculo à direita para conectar a outro</p>
        <p>• Clique em um nó para editar texto, cor, adicionar filhos ou excluir</p>
        <p>• Ao adicionar nó, escolha entre Caixa (fundo colorido) ou Texto (apenas texto)</p>
        <p>• Linhas ficam mais grossas conforme o nó tem mais filhos</p>
      </div>
    </div>
  )
}