import { ErrorBoundary } from './ErrorBoundary.jsx'

export function PageWrapper({ children }) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}
