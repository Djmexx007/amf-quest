'use client'

import { useState, useEffect } from 'react'
import GameShell from '@/components/games/GameShell'
import ResultScreen from '@/components/games/ResultScreen'
import AchievementUnlockToast from '@/components/ui/AchievementUnlockToast'

interface Violation { id: string; text: string; explanation: string; x: number; y: number }
interface Case {
  title: string
  document: string
  violations: Violation[]
}

type Phase = 'playing' | 'result'

// Demo cases (in production these would come from the DB)
const DEMO_CASES: Case[] = [
  {
    title: 'Dossier Leblanc — Assurance invalidité',
    document: `PROPOSITION D'ASSURANCE INVALIDITÉ
Date: 15 mars 2024

Client: Jean-Pierre Leblanc
Âge: 43 ans | Occupation: Travailleur autonome (menuisier)

RECOMMANDATION DU CONSEILLER:
Produit recommandé: Assurance invalidité — toute occupation
Prime mensuelle: 287$/mois
Délai de carence: 30 jours
Durée des prestations: 2 ans

MOTIF: Le client a mentionné vouloir quelque chose d'abordable.
Le produit "toute occupation" a été choisi pour réduire la prime.

DÉCLARATION DE SANTÉ:
Q: Avez-vous eu des problèmes de dos dans les 5 dernières années?
R: Non (case cochée par le conseiller)

Note: Le client a mentionné verbalement avoir eu une hernie discale
en 2022, mais le conseiller n'a pas jugé pertinent de le noter.

SIGNATURE DU CLIENT: J.P. Leblanc
SIGNATURE DU CONSEILLER: M. Tremblay`,
    violations: [
      { id: 'v1', text: 'toute occupation', explanation: 'Un menuisier devrait avoir une police "propre occupation" — "toute occupation" pourrait le forcer à accepter n\'importe quel emploi malgré son invalidité pour son métier.', x: 32, y: 28 },
      { id: 'v2', text: 'N\'a pas jugé pertinent de le noter', explanation: 'Omission volontaire d\'une déclaration de santé matérielle. Violation grave de l\'obligation de divulgation — cela peut annuler la police.', x: 15, y: 72 },
    ]
  }
]

export default function DetectivePage() {
  const [phase, setPhase] = useState<Phase>('playing')
  const [caseIndex] = useState(0)
  const [found, setFound] = useState<Set<string>>(new Set())
  const [falseAlarms, setFalseAlarms] = useState(0)
  const [revealed, setRevealed] = useState<string | null>(null)
  const [branchColor, setBranchColor] = useState('#D4A843')
  const [result, setResult] = useState<{ xp: number; coins: number; levelUp: boolean } | null>(null)
  const [unlockedAchievements, setUnlockedAchievements] = useState<{ slug: string; title: string; xp: number; coins: number }[]>([])
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetch('/api/user/character').then(r => r.json()).then(d => {
      if (d.branch?.color) setBranchColor(d.branch.color)
    })
  }, [])

  const currentCase = DEMO_CASES[caseIndex]
  const allFound = found.size === currentCase.violations.length

  function handleDocumentClick(e: React.MouseEvent<HTMLDivElement>) {
    if (revealed || showAll) return
    const target = e.target as HTMLElement
    const violationId = target.getAttribute('data-violation')
    if (violationId) {
      if (!found.has(violationId)) {
        setFound(prev => new Set([...prev, violationId]))
        setRevealed(violationId)
        setTimeout(() => setRevealed(null), 2500)
      }
    } else {
      // False positive
      setFalseAlarms(f => f + 1)
    }
  }

  async function finishGame() {
    setShowAll(true)
    const score = Math.max(0, Math.round((found.size / currentCase.violations.length) * 100 - falseAlarms * 10))
    const res = await fetch('/api/game/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_type: 'detective', score, questions_total: currentCase.violations.length, questions_correct: found.size, best_streak: 0, avg_time_seconds: 60, difficulty: 3 }),
    })
    const data = await res.json()
    setResult({ xp: data.xp_earned ?? 0, coins: data.coins_earned ?? 0, levelUp: data.level_up ?? false })
    if (data.achievements_unlocked?.length > 0) setUnlockedAchievements(data.achievements_unlocked)
    setTimeout(() => setPhase('result'), 2000)
  }

  // Render document with highlighted violations
  function renderDocument(doc: string, violations: Violation[]) {
    let result = doc
    violations.forEach(v => {
      const escaped = v.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      result = result.replace(new RegExp(escaped, 'g'),
        `<span data-violation="${v.id}" class="violation-highlight ${found.has(v.id) ? 'found' : ''} ${showAll ? 'show-all' : ''}">${v.text}</span>`)
    })
    return result
  }

  return (
    <GameShell title="Le Régulateur" icon="🔍" branchColor={branchColor}>
      <style>{`
        .violation-highlight {
          background: rgba(212,168,67,0.15);
          border-bottom: 2px solid rgba(212,168,67,0.4);
          cursor: pointer;
          padding: 0 2px;
          border-radius: 2px;
          transition: all 0.2s;
        }
        .violation-highlight:hover { background: rgba(212,168,67,0.3); }
        .violation-highlight.found { background: rgba(37,194,146,0.2); border-color: #25C292; }
        .violation-highlight.show-all:not(.found) { background: rgba(255,77,106,0.2); border-color: #FF4D6A; }
      `}</style>

      {phase === 'playing' && (
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Dossier à analyser</p>
              <h2 className="font-cinzel font-bold text-white">{currentCase.title}</h2>
            </div>
            <div className="text-right">
              <p className="text-sm" style={{ color: branchColor }}>
                {found.size}/{currentCase.violations.length} infractions trouvées
              </p>
              {falseAlarms > 0 && <p className="text-xs text-red-400">⚠ {falseAlarms} fausse(s) alarme(s)</p>}
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-4 p-3 rounded-lg bg-[#D4A843]/10 border border-[#D4A843]/20">
            <p className="text-[#D4A843] text-xs">🔍 Clique sur les parties problématiques du document pour les identifier.</p>
          </div>

          {/* Document */}
          <div className="rpg-card p-6 mb-4 cursor-default" onClick={handleDocumentClick}>
            <pre
              className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap font-mono"
              dangerouslySetInnerHTML={{ __html: renderDocument(currentCase.document, currentCase.violations) }}
            />
          </div>

          {/* Revealed explanation */}
          {revealed && (
            <div className="mb-4 p-4 rounded-xl bg-[#25C292]/10 border border-[#25C292]/30 animate-slide-up">
              <p className="text-[#25C292] font-semibold text-sm mb-1">✓ Infraction identifiée!</p>
              <p className="text-gray-300 text-sm">{currentCase.violations.find(v => v.id === revealed)?.explanation}</p>
            </div>
          )}

          <div className="flex gap-3">
            {allFound && !showAll && (
              <button onClick={finishGame}
                className="flex-1 py-3 rounded-lg font-cinzel font-semibold text-sm tracking-wider uppercase"
                style={{ background: `linear-gradient(135deg, ${branchColor}, ${branchColor}99)`, color: '#080A12' }}>
                Soumettre le rapport
              </button>
            )}
            {!allFound && (
              <button onClick={finishGame}
                className="flex-1 py-3 rounded-lg font-semibold text-sm border border-white/10 text-gray-400 hover:text-white transition-all">
                Terminer ({currentCase.violations.length - found.size} infraction{currentCase.violations.length - found.size > 1 ? 's' : ''} manquée{currentCase.violations.length - found.size > 1 ? 's' : ''})
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'result' && result && (
        <ResultScreen score={Math.max(0, Math.round((found.size/currentCase.violations.length)*100 - falseAlarms*10))}
          correct={found.size} total={currentCase.violations.length}
          xpEarned={result.xp} coinsEarned={result.coins} levelUp={result.levelUp}
          branchColor={branchColor}
          onReplay={() => { setFound(new Set()); setFalseAlarms(0); setShowAll(false); setPhase('playing') }}
          gameLabel="Le Régulateur" />
      )}
      <AchievementUnlockToast achievements={unlockedAchievements} onDone={() => setUnlockedAchievements([])} />
    </GameShell>
  )
}
