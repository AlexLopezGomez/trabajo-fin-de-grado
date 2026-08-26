/**
 * MongoDB document types for dashboard operations
 */

import { ObjectId } from "mongodb";
import type { DashboardSharingRule, DashboardPermission } from "@/types/spaces";

export interface DashboardDocument {
  _id: ObjectId;
  name: string;
  description?: string;
  ownerId: string;
  createdBy?: string;
  createdByName?: string;
  isPublic: boolean;
  spaceId?: string;
  spaceName?: string;
  sharing?: {
    mode: "PRIVATE" | "SPACE_INHERIT" | "CUSTOM" | "PUBLIC";
    rules: DashboardSharingRule[];
    publicPermission?: DashboardPermission;
  };
  widgetCount?: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  isArchived?: boolean;
  stats?: {
    viewCount: number;
    lastViewedAt?: Date;
    lastViewedBy?: string;
  };
}