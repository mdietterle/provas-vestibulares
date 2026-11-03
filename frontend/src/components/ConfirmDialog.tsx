interface ConfirmDialogProps {
  open: boolean
  title?: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Excluir', onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white dark:bg-[#1d1f27] border border-[#e8eeff] dark:border-[#464554] rounded-xl shadow-xl p-6 max-w-sm w-full">
        {title && <h3 className="text-lg font-semibold text-[#1E293B] dark:text-[#F8FAFC] mb-2">{title}</h3>}
        <p className="text-gray-800 dark:text-[#e2e8f0] mb-6 whitespace-pre-line">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary">Cancelar</button>
          <button onClick={onConfirm} className={confirmLabel === 'Excluir' ? 'btn-danger' : 'btn-primary'}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
