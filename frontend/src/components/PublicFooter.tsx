import { Link } from 'react-router-dom'

/** Footer compartilhado por todas as páginas públicas — mesmo conjunto de
 * links em toda parte (antes cada página listava um subconjunto diferente). */
export default function PublicFooter() {
  return (
    <footer className="text-[#b6c4ff]" style={{ background: 'linear-gradient(180deg, #1E293B 0%, #071122 100%)' }}>
      <div className="max-w-5xl mx-auto px-6 py-14 grid gap-10 sm:grid-cols-2 md:grid-cols-4">
        <div className="sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #712ae2 0%, #a970ff 100%)' }}>
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="font-display font-bold text-white text-sm">Cognition AI</span>
          </div>
          <p className="text-xs leading-relaxed text-[#7a8bc4]">
            Avaliações e simulados corrigidos por inteligência artificial para escolas e redes de ensino.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-white/90 mb-3">Plataforma</p>
          <div className="flex flex-col gap-2.5 text-xs">
            <Link to="/universidades" className="hover:text-white transition-colors">Universidades</Link>
            <Link to="/calendario" className="hover:text-white transition-colors">Calendário de vestibulares</Link>
            <Link to="/plans" className="hover:text-white transition-colors">Preços</Link>
            <Link to="/aluno" className="hover:text-white transition-colors">Sou aluno</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-white/90 mb-3">Institucional</p>
          <div className="flex flex-col gap-2.5 text-xs">
            <Link to="/sobre" className="hover:text-white transition-colors">Sobre nós</Link>
            <Link to="/ajuda" className="hover:text-white transition-colors">Central de ajuda</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contato</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-white/90 mb-3">Legal</p>
          <div className="flex flex-col gap-2.5 text-xs">
            <Link to="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
            <Link to="/termos" className="hover:text-white transition-colors">Termos de Uso</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-5 text-xs text-[#7a8bc4]">
          © 2026 Cognition AI. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  )
}
