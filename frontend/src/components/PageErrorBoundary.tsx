import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  /** Muda a cada navegação para limpar o erro ao trocar de página. */
  resetKey: string
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Impede que um erro de renderização numa página (ex.: campo faltando na
 * resposta da API) deixe a tela inteira em branco. Mostra um aviso e mantém
 * o menu funcionando.
 */
export default class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro ao renderizar a página', error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="max-w-lg mx-auto mt-16 text-center rounded-2xl border border-[var(--color-border,#E2E8F0)] p-8">
        <h2 className="text-lg font-semibold mb-2">Não foi possível abrir esta página</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
          Algo deu errado ao carregar as informações. Tente recarregar; se continuar, avise o suporte.
        </p>
        <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
          Recarregar
        </button>
      </div>
    )
  }
}
