import { WorkspaceRole } from '../types';

export const canManageMembers = (role?: WorkspaceRole | null): boolean => {
  return role === 'OWNER' || role === 'ADMIN';
};

export const canManageBilling = (role?: WorkspaceRole | null): boolean => {
  return role === 'OWNER' || role === 'ADMIN';
};

export const canAccessSettings = (role?: WorkspaceRole | null): boolean => {
  return role === 'OWNER' || role === 'ADMIN';
};
