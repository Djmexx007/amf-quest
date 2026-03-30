'use client'

import { Suspense } from 'react'
import LoginForm from '@/components/auth/LoginForm'
import StarfieldBg from '@/components/layout/StarfieldBg'

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#080A12]">
      <StarfieldBg />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-[#D4A843] opacity-[0.03] blur-[120px]" />
      </div>
      <div className="relative z-10 w-full max-w-md px-6">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
