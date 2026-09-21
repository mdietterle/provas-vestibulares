import { useEffect, useRef, useState } from 'react'

export type CampusImageVariant = 'polaroid-tilt' | 'float-right' | 'diagonal-strip' | 'reveal-wide' | 'corner-badge'

interface CampusImageProps {
  src: string
  alt: string
  caption?: string
  credit: string
  variant?: CampusImageVariant
  className?: string
}

/**
 * Imagem de campus/laboratório com reveal-on-scroll (IntersectionObserver) e leve
 * zoom no hover. Sem libs externas — anima só com CSS transition + classe de estado.
 * credit é obrigatório: imagens do Wikimedia Commons exigem atribuição (CC BY/BY-SA).
 */
export default function CampusImage({ src, alt, caption, credit, variant = 'reveal-wide', className }: CampusImageProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const wrapperByVariant: Record<CampusImageVariant, string> = {
    'polaroid-tilt': 'max-w-xs mx-auto sm:mx-0 sm:float-left sm:mr-6 mb-4 rotate-[-3deg] hover:rotate-0',
    'float-right': 'max-w-sm mx-auto sm:mx-0 sm:float-right sm:ml-6 mb-4',
    'diagonal-strip': 'w-full my-8 -rotate-1 hover:rotate-0',
    'reveal-wide': 'w-full my-8',
    'corner-badge': 'max-w-[220px] ml-auto',
  }

  const frameByVariant: Record<CampusImageVariant, string> = {
    'polaroid-tilt': 'bg-white dark:bg-[#1a2340] p-3 pb-10 shadow-xl rounded-sm',
    'float-right': 'rounded-2xl overflow-hidden shadow-lg border border-[#E2E8F0] dark:border-[#464554]',
    'diagonal-strip': 'rounded-3xl overflow-hidden shadow-xl',
    'reveal-wide': 'rounded-2xl overflow-hidden shadow-lg border border-[#E2E8F0] dark:border-[#464554]',
    'corner-badge': 'rounded-xl overflow-hidden shadow-md ring-4 ring-white dark:ring-[#191b23]',
  }

  return (
    <figure
      ref={ref}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${wrapperByVariant[variant]} ${className ?? ''}`}
    >
      <div className={`group overflow-hidden ${frameByVariant[variant]}`}>
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>
      {(caption || credit) && (
        <figcaption className="text-[11px] text-[#a0a3af] dark:text-[#908fa0] mt-1.5 leading-snug">
          {caption && <span>{caption} — </span>}
          <span>{credit}</span>
        </figcaption>
      )}
    </figure>
  )
}
