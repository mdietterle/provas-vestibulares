import { useEffect, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export default function Modal({ title, onClose, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Só fecha pelo fundo quando o clique começou e terminou nele. Antes, um clique
  // iniciado dentro do conteúdo que mudava de altura (ex.: lista recarregando)
  // podia terminar no fundo e fechar o formulário sem querer.
  const pressedOnBackdrop = useRef(false)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onMouseDown={(e) => { pressedOnBackdrop.current = e.target === e.currentTarget }}
        onClick={(e) => {
          if (pressedOnBackdrop.current && e.target === e.currentTarget) onClose()
          pressedOnBackdrop.current = false
        }}
      />
      <div className={`relative bg-white dark:bg-[#1d1f27] text-[#1E293B] dark:text-[#e1e2ec] border border-[#e8eeff] dark:border-[#464554] rounded-t-2xl sm:rounded-xl shadow-xl w-full ${sizeClasses[size]} max-h-[92vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#464554]">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  )
}
