import { ErrorBoundary } from './ErrorBoundary.jsx'

export function PageWrapper({ children }) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}

export default PageWrapper
