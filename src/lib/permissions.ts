import type { UserRole } from '@/types'

// -------------------------------------------------------
// Role hierarchy  user < moderator < god
// -------------------------------------------------------

export const ROLE_RANK: Record<UserRole, number> = {
  user:      0,
  moderator: 1,
  god:       2,
}

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[requiredRole]
}

export function isGod(role: UserRole): boolean {
  return role === 'god'
}

/** Moderator or higher (moderator + god) */
export function isModerator(role: UserRole): boolean {
  return role === 'moderator' || role === 'god'
}

// -------------------------------------------------------
// Route-level permissions
// -------------------------------------------------------

/** /admin panel — accessible to moderator+ */
export function canAccessAdminPanel(role: UserRole): boolean {
  return isModerator(role)
}

/** /god panel — god only */
export function canAccessGodPanel(role: UserRole): boolean {
  return isGod(role)
}

// -------------------------------------------------------
// Action-level permissions
// -------------------------------------------------------

/** Moderator can create user invites; god can also create moderator invites */
export function canCreateInvite(role: UserRole): boolean {
  return isModerator(role)
}

export function canSuspendUser(role: UserRole): boolean {
  return isModerator(role)
}

export function canBanUser(role: UserRole): boolean {
  return isModerator(role)
}

export function canDeleteUser(role: UserRole): boolean {
  return isGod(role)
}

export function canManageBranches(role: UserRole): boolean {
  return isGod(role)
}

export function canBulkDeleteUsers(role: UserRole): boolean {
  return isGod(role)
}

export function canResetUserBranch(role: UserRole): boolean {
  return isGod(role)
}

export function canViewAllLogs(role: UserRole): boolean {
  return isModerator(role)
}

export function canSendNotification(role: UserRole): boolean {
  return isModerator(role)
}

export function canViewUserProgress(role: UserRole): boolean {
  return isModerator(role)
}

export function canApproveQuestions(role: UserRole): boolean {
  return isModerator(role)
}

export function canManageInvites(role: UserRole): boolean {
  return isModerator(role)
}

export function canGiveBulkRewards(role: UserRole): boolean {
  return isGod(role)
}
