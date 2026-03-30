import type { Metadata } from 'next'
import { Cinzel, Exo_2 } from 'next/font/google'
import './globals.css'

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  weight: ['400', '600', '700', '900'],
})

const exo2 = Exo_2({
  subsets: ['latin'],
  variable: '--font-exo2',
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'AMF Quest — Prépare ton examen en jouant',
  description: 'Plateforme gamifiée pour la préparation aux examens AMF et CSI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${cinzel.variable} ${exo2.variable}`}>
      <body className="bg-[#080A12] text-white font-exo2 min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
