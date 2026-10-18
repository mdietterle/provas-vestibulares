import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { mindmapsApi, type MindMapData, type MindMapNode } from '../api/mindmaps'

const BRANCH_COLORS = {
  top: '#f97316',    // orange
  right: '#3b82f6',  // blue
  bottom: '#10b981', // green
  left: '#ec4899',   // pink
}

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
    { id: 'root', text: 'Ideia Central', x: 500, y: 400, color: '#f97316' }
  ])
  const [connections, setConnections] = useState<Array<{ from: string; to: string }>>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)
  const dragOffset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!isEdit) return
    mindmapsApi.get(Number(id))
      .then(r => {
        setTitle(r.data.title)
        setNodes(r.data.data.nodes)
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

  const addNode = useCallback((parentId?: string) => {
    const parent = parentId ? nodes.find(n => n.id === parentId) : nodes[0]
    const angle = Math.random() * Math.PI * 2
    const distance = 180 + Math.random() * 80
    const newNode: MindMapNode = {
      id: generateId(),
      text: 'Novo nó',
      x: (parent?.x ?? 500) + Math.cos(angle) * distance,
      y: (parent?.y ?? 400) + Math.sin(angle) * distance,
      color: parentId
        ? nodes.find(n => n.id === parentId)?.color
        : getBranchColor(angle),
      parent_id: parentId,
    }
    setNodes([...nodes, newNode])
    if (parentId) {
      setConnections([...connections, { from: parentId, to: newNode.id }])
    }
    setSelectedNode(newNode.id)
  }, [nodes, connections])

  const deleteNode = useCallback((nodeId: string) => {
    if (nodeId === 'root') return
    setNodes(nodes.filter(n => n.id !== nodeId))
    setConnections(connections.filter(c => c.from !== nodeId && c.to !== nodeId))
    if (selectedNode === nodeId) setSelectedNode(null)
  }, [nodes, connections, selectedNode])

  const updateNodeText = useCallback((nodeId: string, text: string) => {
    setNodes(nodes.map(n => n.id === nodeId ? { ...n, text } : n))
  }, [nodes])

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
          onClick={() => addNode()}
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
        {/* SVG for bezier connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {connections.map((conn, i) => {
            const fromNode = nodes.find(n => n.id === conn.from)
            const toNode = nodes.find(n => n.id === conn.to)
            if (!fromNode || !toNode) return null
            return (
              <path
                key={i}
                d={bezierPath(fromNode.x, fromNode.y, toNode.x, toNode.y)}
                stroke={fromNode.color || '#94a3b8'}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                opacity="0.7"
              />
            )
          })}
        </svg>

        {/* Nodes */}
        {nodes.map(node => (
          <div
            key={node.id}
            className={`absolute group ${selectedNode === node.id ? 'z-20' : 'z-10'}`}
            style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)' }}
            onMouseDown={(e) => handleMouseDown(e, node.id)}
            onMouseUp={() => handleConnectEnd(node.id)}
          >
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

              {/* Action buttons */}
              {selectedNode === node.id && node.id !== 'root' && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); addNode(node.id) }}
                    className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 shadow-lg"
                    title="Adicionar filho"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNode(node.id) }}
                    className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-lg"
                    title="Excluir"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Empty state hint */}
        {nodes.length === 1 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-[#64748B] dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 px-4 py-2 rounded-lg">
              Clique em "+ Nó" para adicionar ou arraste os nós para organizar
            </p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-xs text-[#64748B] dark:text-slate-400 space-y-1 bg-white dark:bg-[#1d1f27] p-3 rounded-lg border border-[#E2E8F0] dark:border-[#464554]">
        <p className="font-semibold mb-2">Como usar:</p>
        <p>• Arraste os nós para reposicionar no canvas</p>
        <p>• Passe o mouse sobre um nó e clique no círculo branco à direita para conectar a outro</p>
        <p>• Clique em um nó para editar o texto, adicionar filhos ou excluir</p>
        <p>• Cores automáticas por direção: laranja (topo), azul (direita), verde (baixo), rosa (esquerda)</p>
      </div>
    </div>
  )
}