import type { UserRole } from '@/types'

// -------------------------------------------------------
// Role hierarchy (higher index = more permissions)
// -------------------------------------------------------

const ROLE_RANK: Record<UserRole, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
  god: 3,
}

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[requiredRole]
}

export function isGod(role: UserRole): boolean {
  return role === 'god'
}

export function isAdmin(role: UserRole): boolean {
  return role === 'admin' || role === 'god'
}

export function isModerator(role: UserRole): boolean {
  return role === 'moderator' || role === 'admin' || role === 'god'
}

// -------------------------------------------------------
// Route-level permissions
// -------------------------------------------------------

export function canAccessAdminPanel(role: UserRole): boolean {
  return isAdmin(role)
}

export function canAccessGodPanel(role: UserRole): boolean {
  return isGod(role)
}

// -------------------------------------------------------
// Action-level permissions
// -------------------------------------------------------

export function canCreateInvite(role: UserRole): boolean {
  return isAdmin(role)
}

export function canSuspendUser(role: UserRole): boolean {
  return isAdmin(role)
}

export function canBanUser(role: UserRole): boolean {
  return isAdmin(role)
}

export function canDeleteUser(role: UserRole): boolean {
  return isAdmin(role)
}

export function canCreateAdmin(role: UserRole): boolean {
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
  return isGod(role)
}

export function canSendNotification(role: UserRole): boolean {
  return isModerator(role)
}

export function canViewUserProgress(role: UserRole): boolean {
  return isModerator(role)
}
