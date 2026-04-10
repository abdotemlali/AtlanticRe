import { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * ErrorBoundary — catches rendering errors in child components
 * and displays a graceful fallback UI instead of a white screen.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 24px',
            minHeight: '300px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'hsla(358,66%,54%,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}
          >
            <AlertTriangle size={28} color="hsl(358,66%,54%)" />
          </div>

          <h2
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--color-navy, hsl(209,28%,24%))',
              marginBottom: 8,
            }}
          >
            Une erreur est survenue
          </h2>

          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--color-gray-500, #6b7280)',
              maxWidth: 420,
              marginBottom: 24,
              lineHeight: 1.5,
            }}
          >
            Ce composant a rencontré un problème inattendu.
            Vous pouvez essayer de recharger la section.
          </p>

          {this.state.error && (
            <pre
              style={{
                fontSize: '0.72rem',
                color: 'hsl(358,66%,54%)',
                background: 'hsla(358,66%,54%,0.06)',
                border: '1px solid hsla(358,66%,54%,0.15)',
                borderRadius: 8,
                padding: '10px 16px',
                maxWidth: 500,
                overflow: 'auto',
                marginBottom: 24,
                textAlign: 'left',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error.message}
            </pre>
          )}

          <button
            onClick={this.handleReload}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 22px',
              borderRadius: 10,
              border: '1px solid var(--color-gray-200, #e2e8f0)',
              background: 'white',
              color: 'var(--color-navy, hsl(209,28%,24%))',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--color-off-white, #f8fafc)'
              e.currentTarget.style.borderColor = 'var(--color-navy, hsl(209,28%,24%))'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'white'
              e.currentTarget.style.borderColor = 'var(--color-gray-200, #e2e8f0)'
            }}
          >
            <RotateCcw size={14} />
            Réessayer
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
