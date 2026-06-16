import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ayojit Intelligence — Civic AI for 1.4 Billion Citizens',
  description:
    'Five AI-powered tools for Indian citizens, farmers, MSMEs, and government departments. Built on open models and public datasets from AIKosh, Government of India.',
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
