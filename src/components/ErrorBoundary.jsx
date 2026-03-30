import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="clay clay-card p-8 text-center my-8 mx-auto max-w-md">
          <p className="text-clay-dark font-bold mb-2">Что-то пошло не так</p>
          <p className="text-clay-muted text-sm mb-4">Попробуйте обновить страницу</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="clay btn-clay-secondary text-sm"
          >
            Попробовать снова
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
