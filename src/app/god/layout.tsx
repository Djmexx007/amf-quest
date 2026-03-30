import TopNav from '@/components/layout/TopNav'
import Sidebar from '@/components/layout/Sidebar'
import ToastContainer from '@/components/ui/Toast'
import StarfieldBg from '@/components/layout/StarfieldBg'
import AuthProvider from '@/components/auth/AuthProvider'

export default function GodLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider requiredRole="god">
      <div className="relative min-h-screen flex flex-col bg-[#080A12]">
        <StarfieldBg />
        <div className="relative z-10 flex flex-col h-screen">
          <TopNav />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
        <ToastContainer />
      </div>
    </AuthProvider>
  )
}
