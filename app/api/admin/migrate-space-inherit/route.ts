import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { migrateSpaceInheritToCustom } from "@/lib/migrations/migrate-space-inherit-to-custom";

export async function POST() {
  try {
    const user = await requireAuth();

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const result = await migrateSpaceInheritToCustom();

    return NextResponse.json({
      success: true,
      message: "Migration completed",
      result,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Migration failed" },
      { status: 500 }
    );
  }
}
