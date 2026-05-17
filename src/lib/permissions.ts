import type { Role } from "@prisma/client";

const permissionMatrix: Record<string, Role[]> = {
  dashboard: ["OWNER", "MANAGER", "PROFESSIONAL", "RECEPTIONIST"],
  appointments: ["OWNER", "MANAGER", "PROFESSIONAL", "RECEPTIONIST"],
  clients: ["OWNER", "MANAGER", "RECEPTIONIST"],
  professionals: ["OWNER", "MANAGER"],
  services: ["OWNER", "MANAGER"],
  financial: ["OWNER", "MANAGER"],
  settings: ["OWNER"],
  admin: ["ADMIN_GLOBAL"],
};

export function canAccess(resource: keyof typeof permissionMatrix, role: Role) {
  return permissionMatrix[resource].includes(role);
}
