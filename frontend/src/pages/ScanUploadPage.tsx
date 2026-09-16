import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { submissionsApi } from '../api/submissions'

export default function ScanUploadPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = (f: File) => {
    setFile(f)
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f))
    } else {
      setPreview(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleSubmit = async () => {
    if (!file || !id) return
    setUploading(true)
    try {
      await submissionsApi.uploadScan(+id, file)
      toast.success('Prova enviada! A correção por IA está em andamento.')
      navigate(`/exams/${id}/result`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erro ao enviar prova')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-xl">
      <button onClick={() => navigate('/exams')} className="btn-secondary btn-sm mb-6">← Voltar</button>
      <h1 className="text-2xl font-bold mb-2">Enviar Prova Digitalizada</h1>
      <p className="text-gray-500 text-sm mb-6">
        Envie uma foto ou scan da sua prova respondida. A IA irá corrigir automaticamente.
        O professor revisará antes de liberar a nota.
      </p>

      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          file ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-lg object-contain mb-3" />
        ) : (
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <p className="text-sm font-medium text-gray-700">
          {file ? file.name : 'Clique ou arraste a imagem aqui'}
        </p>
        <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP ou PDF · Máximo 20 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      {file && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => { setFile(null); setPreview(null) }}
            className="btn-secondary flex-1"
          >
            Trocar arquivo
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="btn-primary flex-1"
          >
            {uploading ? 'Enviando e processando...' : 'Enviar para correção'}
          </button>
        </div>
      )}

      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-200">
        <p className="font-medium mb-1">Dicas para melhor resultado:</p>
        <ul className="space-y-1 text-blue-700 dark:text-blue-300 list-disc list-inside">
          <li>Fotografe em boa iluminação, sem sombras</li>
          <li>Mantenha a folha reta e sem dobras visíveis</li>
          <li>Certifique-se que o QR code no rodapé está visível</li>
          <li>Para provas com múltiplas páginas, envie em um único PDF</li>
        </ul>
      </div>
    </div>
  )
}
