import { getAuthDatabase } from "@/lib/db";
import { ObjectId } from "mongodb";

/**
 * Migration: Convert SPACE_INHERIT dashboards to CUSTOM mode
 *
 * For each dashboard with sharing.mode = "SPACE_INHERIT":
 * 1. Change mode to "CUSTOM"
 * 2. Add a sharing rule: { type: "SPACE", targetId: dashboard.spaceId, permission: "ADMIN" }
 * 3. Log the migration
 */
export async function migrateSpaceInheritToCustom() {
  const db = await getAuthDatabase();
  const dashboards = db.collection("dashboards");

  const spaceInheritDashboards = await dashboards.find({
    "sharing.mode": "SPACE_INHERIT",
    spaceId: { $exists: true, $ne: null }
  }).toArray();

  console.log(`Found ${spaceInheritDashboards.length} dashboards with SPACE_INHERIT mode`);

  let migrated = 0;
  let failed = 0;

  for (const dashboard of spaceInheritDashboards) {
    try {
      const now = new Date();

      const newRule = {
        id: new ObjectId().toString(),
        type: "SPACE" as const,
        targetId: dashboard.spaceId,
        permission: "ADMIN" as const,
        grantedBy: "system-migration",
        grantedAt: now,
      };

      await dashboards.updateOne(
        { _id: dashboard._id },
        {
          $set: {
            "sharing.mode": "CUSTOM",
            "sharing.rules": [newRule],
            updatedAt: now,
          },
          $push: {
            auditLog: {
              action: "MIGRATION_SPACE_INHERIT_TO_CUSTOM",
              performedBy: { id: "system", name: "System Migration" },
              timestamp: now,
              details: {
                oldMode: "SPACE_INHERIT",
                newMode: "CUSTOM",
                spaceId: dashboard.spaceId,
                spaceName: dashboard.spaceName,
              },
            },
          },
        } as any
      );

      migrated++;
      console.log(`✓ Migrated dashboard ${dashboard._id} (${dashboard.name})`);
    } catch (error) {
      failed++;
      console.error(`✗ Failed to migrate dashboard ${dashboard._id}:`, error);
    }
  }

  console.log(`\nMigration complete:`);
  console.log(`  ✓ Migrated: ${migrated}`);
  console.log(`  ✗ Failed: ${failed}`);
  console.log(`  Total: ${spaceInheritDashboards.length}`);

  return { migrated, failed, total: spaceInheritDashboards.length };
}
