// ============================================================
// AMF QUEST — Types & Interfaces
// ============================================================

// -------------------------------------------------------
// Enums
// -------------------------------------------------------

export type UserRole = 'god' | 'moderator' | 'user'

export type UserStatus =
  | 'active'
  | 'pending'
  | 'suspended'
  | 'banned'
  | 'expired'

export type AccountType = 'permanent' | 'temporary'

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled'

export type GameType =
  | 'quiz'
  | 'dungeon'
  | 'memory'
  | 'speed-sort'
  | 'scenario'
  | 'detective'
  | 'trivia-crack'
  | 'platformer'

export type ItemType = 'avatar' | 'title' | 'boost' | 'cosmetic'

export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary'

export type NotificationType = 'info' | 'warning' | 'success' | 'admin'

export type CharacterClass =
  | 'Recrue'
  | 'Analyste'
  | 'Conseiller'
  | 'Expert'
  | 'Maître'
  | 'Légende'

// -------------------------------------------------------
// Database Models
// -------------------------------------------------------

export interface Branch {
  id: string
  slug: string
  name: string
  description: string | null
  color: string
  icon: string
  exam_provider: string | null
  is_active: boolean
  unlock_level: number
  order_index: number
  created_by: string | null
  created_at: string
}

export interface User {
  id: string
  email: string
  password_hash: string | null
  full_name: string
  role: UserRole
  status: UserStatus
  account_type: AccountType
  expires_at: string | null
  selected_branch_id: string | null
  branch_locked: boolean
  invited_by: string | null
  suspension_reason: string | null
  suspension_ends_at: string | null
  ban_reason: string | null
  notes: string | null
  last_login_at: string | null
  login_count: number
  created_at: string
  updated_at: string
}

export interface Invitation {
  id: string
  token: string
  email: string
  full_name: string | null
  invited_by: string | null
  role: UserRole
  account_type: AccountType
  account_duration_days: number | null
  suggested_branch_id: string | null
  status: InvitationStatus
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface Character {
  id: string
  user_id: string
  branch_id: string
  name: string
  class_name: CharacterClass
  level: number
  xp: number
  xp_to_next_level: number
  coins: number
  hp: number
  hp_max: number
  mp: number
  mp_max: number
  streak_days: number
  last_activity_date: string | null
  total_games_played: number
  total_questions_answered: number
  total_correct_answers: number
  avatar_config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Module {
  id: string
  branch_id: string
  slug: string
  title: string
  description: string | null
  icon: string
  unlock_level: number
  order_index: number
  is_active: boolean
  created_at: string
}

export interface Question {
  id: string
  module_id: string
  branch_id: string
  question_text: string
  context_text: string | null
  icon: string
  difficulty: 1 | 2 | 3
  game_types: GameType[]
  explanation: string
  tip: string | null
  tags: string[] | null
  is_active: boolean
  created_by: string | null
  created_at: string
}

export interface Answer {
  id: string
  question_id: string
  answer_text: string
  is_correct: boolean
  order_index: number
}

export interface QuestionWithAnswers extends Question {
  answers: Answer[]
}

export interface GameSession {
  id: string
  user_id: string
  branch_id: string
  game_type: GameType
  module_id: string | null
  difficulty: string | null
  score: number
  xp_earned: number
  coins_earned: number
  questions_total: number
  questions_correct: number
  best_streak: number
  avg_time_seconds: number
  completed: boolean
  metadata: Record<string, unknown>
  started_at: string
  completed_at: string | null
}

export interface UserModuleProgress {
  id: string
  user_id: string
  branch_id: string
  module_id: string
  completion_pct: number
  questions_answered: number
  correct_answers: number
  best_score: number
  time_spent_seconds: number
  last_activity_at: string | null
  created_at: string
}

export interface DailyMission {
  id: string
  user_id: string
  branch_id: string
  mission_type: string
  title: string
  description: string | null
  target_value: number
  current_value: number
  xp_reward: number
  coin_reward: number
  completed: boolean
  mission_date: string
  completed_at: string | null
}

export interface Achievement {
  id: string
  branch_id: string | null
  slug: string
  title: string
  description: string | null
  icon: string
  condition_type: string
  condition_value: number
  xp_reward: number
  coin_reward: number
  rarity: ItemRarity
}

export interface UserAchievement {
  id: string
  user_id: string
  branch_id: string
  achievement_id: string
  unlocked_at: string
}

export interface ShopItem {
  id: string
  branch_id: string | null
  name: string
  description: string | null
  icon: string | null
  item_type: ItemType
  cost_coins: number
  effect: Record<string, unknown> | null
  rarity: ItemRarity
  is_active: boolean
  created_at: string
}

export interface UserInventory {
  id: string
  user_id: string
  branch_id: string
  item_id: string
  acquired_at: string
  is_equipped: boolean
}

export interface AdminLog {
  id: string
  admin_id: string | null
  action: string
  target_user_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  is_read: boolean
  sent_by: string | null
  created_at: string
}

// -------------------------------------------------------
// Auth & Session
// -------------------------------------------------------

export interface JWTPayload {
  sub: string          // user id
  email: string
  role: UserRole
  status: UserStatus
  branch_id: string | null
  branch_locked: boolean
  iat?: number
  exp?: number
}

export interface RefreshTokenPayload {
  sub: string
  version: number
  iat?: number
  exp?: number
}

export interface AuthSession {
  user: Pick<User, 'id' | 'email' | 'full_name' | 'role' | 'status' | 'selected_branch_id' | 'branch_locked'>
  accessToken: string
  refreshToken: string
}

// -------------------------------------------------------
// API Request / Response helpers
// -------------------------------------------------------

export interface ApiError {
  error: string
  code?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
}

// -------------------------------------------------------
// Admin
// -------------------------------------------------------

export interface UserWithBranch extends User {
  branch?: Branch | null
  inviter?: Pick<User, 'id' | 'full_name' | 'email'> | null
}

export interface AdminStats {
  total_users: number
  active_users: number
  pending_invitations: number
  suspended_users: number
  banned_users: number
  expired_users: number
  sessions_today: number
  new_users_this_week: number
}

// -------------------------------------------------------
// Game
// -------------------------------------------------------

export interface GameResult {
  session_id: string
  score: number
  xp_earned: number
  coins_earned: number
  questions_total: number
  questions_correct: number
  best_streak: number
  level_up: boolean
  new_level?: number
  achievements_unlocked: Achievement[]
}

export interface LeaderboardEntry {
  rank: number
  user_id: string
  full_name: string
  character_name: string
  level: number
  class_name: CharacterClass
  xp: number
  streak_days: number
}

// -------------------------------------------------------
// UI / Store
// -------------------------------------------------------

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
  duration?: number
}

export interface BranchTheme {
  color: string
  colorDim: string
  gradient: string
  shadow: string
}
