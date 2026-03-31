import TopNav from '@/components/layout/TopNav'
import Sidebar from '@/components/layout/Sidebar'
import ToastContainer from '@/components/ui/Toast'
import StarfieldBg from '@/components/layout/StarfieldBg'
import BgWrapper from '@/components/layout/BgWrapper'
import AuthProvider from '@/components/auth/AuthProvider'

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <BgWrapper>
        <StarfieldBg />
        <div className="relative z-10 flex flex-col h-screen">
          <TopNav />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
        <ToastContainer />
      </BgWrapper>
    </AuthProvider>
  )
}
