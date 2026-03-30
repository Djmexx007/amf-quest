import { redirect } from 'next/navigation'

// Root handled by middleware — this is just a fallback
export default function RootPage() {
  redirect('/login')
}
