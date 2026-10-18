import api from './client'

export type MindMapNode = {
  id: string
  text: string
  x: number
  y: number
  color?: string
  parent_id?: string
}

export type MindMapData = {
  nodes: MindMapNode[]
  connections: Array<{ from: string; to: string }>
}

export type MindMap = {
  id: number
  title: string
  data: MindMapData
  created_at: string
  updated_at: string
}

export const mindmapsApi = {
  list: () => api.get<MindMap[]>('/mindmaps/mine'),
  get: (id: number) => api.get<MindMap>(`/mindmaps/${id}`),
  create: (title: string, data: MindMapData) =>
    api.post<MindMap>('/mindmaps', { title, data }),
  update: (id: number, payload: { title?: string; data?: MindMapData }) =>
    api.put<MindMap>(`/mindmaps/${id}`, payload),
  delete: (id: number) => api.delete(`/mindmaps/${id}`),
}