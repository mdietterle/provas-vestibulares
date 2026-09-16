import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { classesApi, examsApi } from '../api'
import { submissionsApi } from '../api/submissions'
import { downloadBulkPdf, downloadPdf } from '../api/download'
import { useAuth } from '../contexts/AuthContext'
import type { Exam, User } from '../types'

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Múltipla Escolha',
  true_false: 'Verdadeiro/Falso',
  essay: 'Dissertativa',
}

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [exam, setExam] = useState<Exam | null>(null)
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<User[]>([])

  // Professor scan upload state
  const [scanFile, setScanFile] = useState<File | null>(null)
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [scanDragging, setScanDragging] = useState(false)
  const [scanUploading, setScanUploading] = useState(false)
  const [scanResult, setScanResult] = useState<{
    studentName: string
    method: string
    confidence: string
  } | null>(null)
  const [scanUnidentified, setScanUnidentified] = useState<{ readName?: string } | null>(null)
  const [scanManualStudent, setScanManualStudent] = useState(0)
  const scanInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    examsApi.get(+id)
      .then((r) => {
        setExam(r.data)
        if (user?.role !== 'student' && r.data.class_?.id) {
          classesApi.listStudents(r.data.class_.id).then(s => setStudents(s.data))
        }
      })
      .catch(() => { toast.error('Prova não encontrada'); navigate('/exams') })
      .finally(() => setLoading(false))
  }, [id])

  const pickScanFile = (file: File) => {
    setScanFile(file)
    setScanResult(null)
    setScanUnidentified(null)
    setScanManualStudent(0)
    const reader = new FileReader()
    reader.onload = (e) => setScanPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const doUploadScan = async (studentId?: number) => {
    if (!scanFile || !exam) return
    setScanUploading(true)
    try {
      const r = await submissionsApi.professorUploadScan(exam.id, scanFile, studentId)
      const student = r.data.identified_student
      setScanResult({
        studentName: student?.name ?? 'Desconhecido',
        method: r.data.identification_method,
        confidence: r.data.identification_confidence,
      })
      setScanUnidentified(null)
      setScanFile(null)
      setScanPreview(null)
      toast.success(`Prova enviada para correção — ${student?.name}`)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (err.response?.status === 422 && detail?.message) {
        setScanUnidentified({ readName: detail.read_name })
        toast.error('Não foi possível identificar o aluno automaticamente')
      } else {
        toast.error(detail || 'Erro ao enviar scan')
      }
    } finally {
      setScanUploading(false)
    }
  }

  const methodLabel = (method: string) => {
    if (method === 'qr') return 'QR Code'
    if (method === 'name') return 'Nome (fuzzy)'
    return method
  }

  if (loading) return <div className="text-center py-12">Carregando...</div>
  if (!exam) return null

  const totalPoints = exam.exam_questions.reduce((s, q) => s + q.points, 0)

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/exams')} className="btn-secondary btn-sm">← Voltar</button>
        <h1 className="text-2xl font-bold flex-1">{exam.title}</h1>
        {user?.role !== 'student' && (
          <button
            className="btn-primary btn-sm"
            onClick={async () => {
              try {
                await downloadBulkPdf(exam.id, `provas-${exam.title.replace(/\s+/g, '-')}.zip`)
              } catch {
                toast.error('Erro ao gerar ZIP')
              }
            }}
          >
            Baixar prova offline para correção via IA
          </button>
        )}
        <button
          className="btn-secondary btn-sm"
          onClick={async () => {
            try {
              await downloadPdf(exam.id, `prova-${exam.title.replace(/\s+/g, '-')}.pdf`)
            } catch {
              toast.error('Erro ao gerar PDF')
            }
          }}
        >
          Exportar prova sem QRCode
        </button>
      </div>

      <div className="card mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Matéria:</span> <span className="font-medium">{exam.subject.name}</span></div>
          <div><span className="text-gray-500">Turma:</span> <span className="font-medium">{exam.class_.name} — {exam.class_.year}</span></div>
          <div><span className="text-gray-500">Professor:</span> <span className="font-medium">{exam.professor.name}</span></div>
          <div><span className="text-gray-500">Total:</span> <span className="font-medium">{totalPoints} pontos</span></div>
        </div>
        {exam.instructions && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600"><span className="font-medium">Instruções:</span> {exam.instructions}</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {exam.exam_questions.map((eq, i) => {
          const q = eq.question
          return (
            <div key={eq.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="badge bg-gray-100 text-gray-600 text-xs">{TYPE_LABELS[q.question_type]}</span>
                    {q.difficulty && (
                      <span className="badge bg-yellow-100 text-yellow-700 text-xs">{q.difficulty}</span>
                    )}
                    {q.is_public && (
                      <span className="badge bg-green-100 text-green-700 text-xs">Pública</span>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-500 shrink-0">{eq.points} pts</span>
              </div>

              <div className="rich-statement text-gray-900 mb-4" dangerouslySetInnerHTML={{ __html: q.statement }} />

              {(q as any).image_base64 && (
                <img
                  src={(q as any).image_base64?.startsWith('data:') ? (q as any).image_base64 : `data:image/jpeg;base64,${(q as any).image_base64}`}
                  alt="Imagem da questão"
                  className="mb-4 rounded-lg border max-h-48 object-contain"
                  style={{ borderColor: '#E2E8F0' }}
                />
              )}

              {q.options.length > 0 && (
                <div className="space-y-2">
                  {q.options.sort((a, b) => a.order - b.order).map((opt, oi) => (
                    <div key={opt.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                        user?.role !== 'student' && opt.is_correct
                          ? 'bg-green-50 border-green-200 text-green-800'
                          : 'border-gray-200'
                      }`}>
                      <span className="w-5 h-5 border-2 rounded-full shrink-0 mt-0.5 flex items-center justify-center
                        border-gray-300 text-xs font-bold">
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span>{opt.text}</span>
                      {user?.role !== 'student' && opt.is_correct && (
                        <span className="ml-auto text-green-600 font-medium">✓ Correta</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {q.question_type === 'essay' && (
                <div className="mt-3 border-2 border-dashed border-gray-200 rounded-lg p-4 text-gray-400 text-sm">
                  Espaço para resposta dissertativa
                </div>
              )}
            </div>
          )
        })}
      </div>

{user?.role !== 'student' && (
        <div className="card mt-6">
          <h2 className="font-semibold mb-1">Upload de Provas Digitalizadas</h2>
          <p className="text-sm text-gray-500 mb-4">
            Envie scans de provas recolhidas em sala. A IA identificará o aluno pelo QR code ou pelo nome e iniciará a correção automaticamente.
          </p>

          {/* Drop zone */}
          {!scanFile && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                scanDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300'
              }`}
              onDragOver={(e) => { e.preventDefault(); setScanDragging(true) }}
              onDragLeave={() => setScanDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setScanDragging(false)
                const f = e.dataTransfer.files[0]
                if (f) pickScanFile(f)
              }}
              onClick={() => scanInputRef.current?.click()}
            >
              <input
                ref={scanInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) pickScanFile(f) }}
              />
              <p className="text-gray-500 text-sm">Arraste uma imagem ou clique para selecionar</p>
              <p className="text-gray-400 text-xs mt-1">JPG, PNG, PDF — máx. 20 MB</p>
            </div>
          )}

          {/* Preview + actions */}
          {scanFile && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                {scanPreview && (
                  <img src={scanPreview} alt="preview" className="w-32 h-40 object-cover rounded border" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">{scanFile.name}</p>
                  <p className="text-xs text-gray-400">{(scanFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button
                    className="text-xs text-gray-400 hover:text-red-500 mt-1"
                    onClick={() => { setScanFile(null); setScanPreview(null); setScanUnidentified(null); setScanResult(null) }}
                  >
                    Remover
                  </button>
                </div>
              </div>

              {/* Unidentified — manual selector */}
              {scanUnidentified && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-yellow-800 font-medium">
                    Não foi possível identificar o aluno automaticamente.
                    {scanUnidentified.readName && (
                      <span className="text-gray-600"> (nome lido: "{scanUnidentified.readName}")</span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <select
                      className="input flex-1"
                      value={scanManualStudent}
                      onChange={(e) => setScanManualStudent(+e.target.value)}
                    >
                      <option value={0}>Selecionar aluno...</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <button
                      className="btn-primary"
                      disabled={!scanManualStudent || scanUploading}
                      onClick={() => doUploadScan(scanManualStudent)}
                    >
                      {scanUploading ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                </div>
              )}

              {/* Normal upload button */}
              {!scanUnidentified && (
                <button
                  className="btn-primary w-full"
                  disabled={scanUploading}
                  onClick={() => doUploadScan()}
                >
                  {scanUploading ? 'Identificando e enviando...' : 'Identificar aluno e enviar para correção'}
                </button>
              )}
            </div>
          )}

          {/* Success result */}
          {scanResult && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 font-medium">Prova enviada com sucesso</p>
              <p className="text-sm text-gray-600 mt-1">
                Aluno: <span className="font-medium">{scanResult.studentName}</span>
                {' · '}Identificado por: <span className="font-medium">{methodLabel(scanResult.method)}</span>
                {' · '}Confiança: <span className="font-medium">{scanResult.confidence}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">A correção está sendo processada em segundo plano.</p>
              <button
                className="btn-secondary btn-sm mt-2"
                onClick={() => setScanResult(null)}
              >
                Enviar outra prova
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
