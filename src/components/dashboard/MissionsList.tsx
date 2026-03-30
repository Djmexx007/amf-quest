'use client'

import type { DailyMission, Branch } from '@/types'
import ProgressBar from '@/components/ui/ProgressBar'

interface Props {
  missions: DailyMission[]
  branch: Branch
}

const MISSION_ICONS: Record<string, string> = {
  complete_quiz: '⚡',
  perfect_score: '🎯',
  dungeon_run: '🏰',
  streak_maintain: '🔥',
  memory_game: '🃏',
  speed_sort: '⚡',
  scenario: '👔',
  default: '📋',
}

export default function MissionsList({ missions, branch }: Props) {
  const completedCount = missions.filter((m) => m.completed).length

  return (
    <div className="rpg-card p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-cinzel font-bold text-white tracking-wide">Missions du jour</h3>
        <span className="text-sm" style={{ color: branch.color }}>
          {completedCount}/{missions.length}
        </span>
      </div>

      {missions.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">
          Aucune mission aujourd'hui. Reviens demain !
        </p>
      ) : (
        <div className="space-y-3">
          {missions.map((mission) => {
            const icon = MISSION_ICONS[mission.mission_type] ?? MISSION_ICONS.default
            const progressPct = Math.min(100, (mission.current_value / mission.target_value) * 100)

            return (
              <div
                key={mission.id}
                className="flex items-start gap-3 p-3 rounded-lg transition-all"
                style={{
                  background: mission.completed
                    ? `${branch.color}10`
                    : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${mission.completed ? `${branch.color}30` : 'rgba(255,255,255,0.06)'}`,
                  opacity: mission.completed ? 0.7 : 1,
                }}
              >
                <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p
                      className="text-sm font-medium"
                      style={{ color: mission.completed ? branch.color : 'white' }}
                    >
                      {mission.completed && '✓ '}{mission.title}
                    </p>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      +{mission.xp_reward} XP
                    </span>
                  </div>
                  {!mission.completed && mission.target_value > 1 && (
                    <div className="mt-2">
                      <ProgressBar
                        value={mission.current_value}
                        max={mission.target_value}
                        color={branch.color}
                        height={4}
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        {mission.current_value}/{mission.target_value}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
