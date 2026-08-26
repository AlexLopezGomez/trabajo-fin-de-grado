import { withAuthDatabaseTransaction } from "@/lib/db/helpers";
import type {
  DashboardSharingRule,
  SharingTargetType,
  DashboardPermission,
} from "@/types/spaces";
import { v4 as uuidv4 } from "uuid";
import { AuditService } from "@/lib/services/audit.service";
import { resolveTargetName } from "./sharing-targets.service";

/**
 * Dashboard Sharing Rules Service
 *
 * Handles CRUD operations for custom dashboard sharing rules.
 * Manages permissions, expiration, and audit logging for rule changes.
 */

/**
 * Add a sharing rule to a dashboard
 */
export async function addSharingRule(
  dashboardId: string,
  rule: {
    type: SharingTargetType;
    targetId: string;
    permission: DashboardPermission;
    expiresAt?: Date;
    note?: string;
  },
  actor: { id: string; name: string; email: string }
): Promise<DashboardSharingRule> {
  return withAuthDatabaseTransaction(async (db, session, ObjectId) => {
    const dashboard = await db.collection("dashboards").findOne(
      { _id: new ObjectId(dashboardId) },
      { session }
    );

    if (!dashboard) {
      throw new Error("Dashboard not found");
    }

    // Verify target exists and get name
    const targetName = await resolveTargetName(db, rule.type, rule.targetId, session);

    // Check for duplicate rule
    const existingRules = dashboard.sharing?.rules || [];
    const duplicateRule = existingRules.find(
      (r: DashboardSharingRule) => r.type === rule.type && r.targetId === rule.targetId
    );
    if (duplicateRule) {
      throw new Error(`${rule.type.toLowerCase()} already has access to this dashboard`);
    }

    // Create the new rule
    const newRule: DashboardSharingRule = {
      id: uuidv4(),
      type: rule.type,
      targetId: rule.targetId,
      targetName,
      permission: rule.permission,
      grantedBy: actor.id,
      grantedAt: new Date(),
      expiresAt: rule.expiresAt,
      note: rule.note,
    };

    // Update dashboard
    await db.collection("dashboards").updateOne(
      { _id: new ObjectId(dashboardId) },
      {
        $push: { "sharing.rules": newRule } as any,
        $set: {
          "sharing.mode": "CUSTOM", // Auto-switch to CUSTOM mode
          updatedAt: new Date(),
        },
      },
      { session }
    );

    // Audit log
    await AuditService.logAction({
      action: "DASHBOARD_SHARE_ADDED",
      actor,
      targetType: "dashboard",
      targetId: dashboardId,
      targetName: dashboard.name,
      details: {
        shareType: rule.type,
        shareTargetId: rule.targetId,
        shareTargetName: targetName,
        permission: rule.permission,
        expiresAt: rule.expiresAt || null,
      },
      session,
    });

    return newRule;
  });
}

/**
 * Update a sharing rule
 */
export async function updateSharingRule(
  dashboardId: string,
  ruleId: string,
  updates: {
    permission?: DashboardPermission;
    expiresAt?: Date | null;
    note?: string;
  },
  actor: { id: string; name: string; email: string }
): Promise<DashboardSharingRule> {
  return withAuthDatabaseTransaction(async (db, session, ObjectId) => {
    const dashboard = await db.collection("dashboards").findOne(
      { _id: new ObjectId(dashboardId) },
      { session }
    );

    if (!dashboard) {
      throw new Error("Dashboard not found");
    }

    const rules = dashboard.sharing?.rules || [];
    const ruleIndex = rules.findIndex((r: DashboardSharingRule) => r.id === ruleId);

    if (ruleIndex === -1) {
      throw new Error("Sharing rule not found");
    }

    const existingRule = rules[ruleIndex];
    const updatedRule = {
      ...existingRule,
      ...(updates.permission !== undefined && { permission: updates.permission }),
      ...(updates.expiresAt !== undefined && { expiresAt: updates.expiresAt }),
      ...(updates.note !== undefined && { note: updates.note }),
    };

    rules[ruleIndex] = updatedRule;

    await db.collection("dashboards").updateOne(
      { _id: new ObjectId(dashboardId) },
      {
        $set: {
          "sharing.rules": rules,
          updatedAt: new Date(),
        },
      },
      { session }
    );

    // Audit log
    await AuditService.logAction({
      action: "DASHBOARD_SHARE_UPDATED",
      actor,
      targetType: "dashboard",
      targetId: dashboardId,
      targetName: dashboard.name,
      details: {
        ruleId,
        shareType: existingRule.type,
        shareTargetName: existingRule.targetName,
        changes: updates,
      },
      session,
    });

    return updatedRule;
  });
}

/**
 * Remove a sharing rule
 */
export async function removeSharingRule(
  dashboardId: string,
  ruleId: string,
  actor: { id: string; name: string; email: string }
): Promise<{ success: boolean; message: string }> {
  return withAuthDatabaseTransaction(async (db, session, ObjectId) => {
    const dashboard = await db.collection("dashboards").findOne(
      { _id: new ObjectId(dashboardId) },
      { session }
    );

    if (!dashboard) {
      throw new Error("Dashboard not found");
    }

    const rules = dashboard.sharing?.rules || [];
    const rule = rules.find((r: DashboardSharingRule) => r.id === ruleId);

    if (!rule) {
      throw new Error("Sharing rule not found");
    }

    await db.collection("dashboards").updateOne(
      { _id: new ObjectId(dashboardId) },
      {
        $pull: { "sharing.rules": { id: ruleId } } as any,
        $set: { updatedAt: new Date() },
      },
      { session }
    );

    // Audit log
    await AuditService.logAction({
      action: "DASHBOARD_SHARE_REMOVED",
      actor,
      targetType: "dashboard",
      targetId: dashboardId,
      targetName: dashboard.name,
      details: {
        ruleId,
        shareType: rule.type,
        shareTargetId: rule.targetId,
        shareTargetName: rule.targetName,
      },
      session,
    });

    return { success: true, message: "Access revoked" };
  });
}

/**
 * Validate sharing rule data
 */
export function validateSharingRule(
  rule: {
    type: SharingTargetType;
    targetId: string;
    permission: DashboardPermission;
    expiresAt?: Date;
    note?: string;
  }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!rule.type || !["USER", "GROUP", "SPACE"].includes(rule.type)) {
    errors.push("Invalid target type");
  }

  if (!rule.targetId || rule.targetId.trim().length === 0) {
    errors.push("Target ID is required");
  }

  if (!rule.permission || !["VIEW", "EDIT"].includes(rule.permission)) {
    errors.push("Invalid permission level");
  }

  if (rule.expiresAt && rule.expiresAt <= new Date()) {
    errors.push("Expiration date must be in the future");
  }

  if (rule.note && rule.note.length > 500) {
    errors.push("Note must not exceed 500 characters");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get sharing rules for a dashboard
 */
export async function getSharingRules(dashboardId: string): Promise<DashboardSharingRule[]> {
  const db = await import("@/lib/db").then(m => m.getAuthDatabase());
  const { ObjectId } = await import("mongodb");

  const dashboard = await db.collection("dashboards").findOne(
    { _id: new ObjectId(dashboardId) }
  );

  if (!dashboard) {
    throw new Error("Dashboard not found");
  }

  return dashboard.sharing?.rules || [];
}