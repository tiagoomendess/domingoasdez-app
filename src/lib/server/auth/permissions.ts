import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { permissions, userPermissions } from '#lib/server/db/schema.ts';

/** Load the permission names granted to a user (ports User→permissions). */
export async function getUserPermissionNames(userId: number): Promise<Set<string>> {
	const rows = await db
		.select({ name: permissions.name })
		.from(userPermissions)
		.innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
		.where(eq(userPermissions.userId, userId));

	return new Set(rows.map((row) => row.name));
}

/**
 * Ports `has_permission($name)`: `admin` grants everything;
 * otherwise exact name match.
 */
export function hasPermission(names: Set<string>, permissionName: string): boolean {
	if (names.has('admin')) return true;
	return names.has(permissionName);
}
