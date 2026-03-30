import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#080A12] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-7xl mb-6">⚔️</div>
        <h1 className="font-cinzel text-4xl font-black text-[#D4A843] mb-2 tracking-widest">404</h1>
        <h2 className="font-cinzel text-xl font-bold text-white mb-4">Page introuvable</h2>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          Cette salle du donjon n'existe pas. Le brouillard de guerre t'a égaré.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-cinzel font-bold text-sm tracking-widest uppercase transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #D4A843, #B8892A)', color: '#080A12' }}
        >
          Retour au royaume
        </Link>
      </div>
    </div>
  )
}
