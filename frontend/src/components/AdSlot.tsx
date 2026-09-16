import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

// O script do adsbygoogle.js já é carregado estaticamente no <head> de index.html
// (exigido pelo verificador de site do AdSense, que não executa a injeção via JS).
const ADSENSE_CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT_ID as string | undefined

// Flag separada do client ID: o client ID precisa continuar presente no HTML
// pro verificador de site do AdSense (aprovação em andamento), mas os slots de
// anúncio em si só devem renderizar de verdade depois que a conta for aprovada
// — até lá, mostra sempre o placeholder "Espaço reservado", em vez de um
// <ins> real que fica em branco/quebrado com a conta ainda não aprovada.
const ADSENSE_APPROVED = import.meta.env.VITE_ADSENSE_APPROVED === 'true'

interface AdSlotProps {
  slot: string
  className?: string
}

export default function AdSlot({ slot, className }: AdSlotProps) {
  const insRef = useRef<HTMLModElement>(null)

  useEffect(() => {
    if (!ADSENSE_CLIENT_ID || !ADSENSE_APPROVED) return
    try {
      window.adsbygoogle = window.adsbygoogle || []
      window.adsbygoogle.push({})
    } catch {
      // AdSense script pode ainda não ter carregado; falha silenciosa não deve travar a UI.
    }
  }, [])

  if (!ADSENSE_CLIENT_ID || !ADSENSE_APPROVED) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-dashed border-[#c5d0ff] dark:border-[#2e3f66] bg-[#F4F6F9] dark:bg-[#131f37] text-xs text-[#64748B] dark:text-[#94a3b8] ${className ?? 'h-24'}`}
      >
        Espaço reservado para anúncio
      </div>
    )
  }

  // Só chega aqui depois que VITE_ADSENSE_APPROVED='true' for ligado. O
  // criativo do AdSense sempre renderiza com fundo branco (fora do nosso
  // controle) — a moldura arredondada + rótulo "Publicidade" deixa isso lido
  // como bloco de anúncio de propósito, não bug visual.
  return (
    <div className={`overflow-hidden rounded-xl border border-[#E2E8F0] dark:border-[#2e3f66] bg-white ${className ?? 'h-24'}`}>
      <p className="text-[9px] uppercase tracking-wider text-[#a0a3af] px-2 pt-1">Publicidade</p>
      <ins
        ref={insRef}
        className="adsbygoogle block"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
