/**
 * Full Environment Seed Script
 * 
 * Initializes a fresh database with everything needed to run the app:
 *   1. Admin user configured through .env.local
 *   2. Built-in permission_sets (Administrator, Supervisor, Operator, Viewer)
 * 
 * Safe to run multiple times. It skips anything that already exists.
 * 
 * Usage:
 *   npm run seed
 */

import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.AUTH_MONGODB_URI || process.env.MONGODB_URI;
const AUTH_DATABASE = process.env.AUTH_DATABASE;
const INITIAL_ADMIN_EMAIL = process.env.INITIAL_ADMIN_EMAIL;
const INITIAL_ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD;
const INITIAL_ADMIN_NAME = process.env.INITIAL_ADMIN_NAME || "Administrator";
const BCRYPT_ROUNDS = 12;

// ============================================
// 2. BUILT-IN PERMISSION SETS (4-Role RBAC)
// ============================================

const BUILT_IN_PERMISSION_SETS = [
    {
        id: "admin",
        name: "Administrator",
        description: "Full system access with unrestricted permissions",
        permissionIds: ["*"],
        isBuiltIn: true,
        isCustom: false,
        deprecated: false,
        dataAccess: {
            collections: "*",
            fieldMasking: {},
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: "supervisor",
        name: "Supervisor",
        description: "Execute all queries and approve heavy queries from Operators",
        permissionIds: [
            "view_dashboard",
            "create_dashboard",
            "edit_dashboard",
            "share_dashboard",
            "create_query",
            "execute_query",
            "approve_query",
            "view_users",
            "manage_spaces",
        ],
        isBuiltIn: true,
        isCustom: false,
        deprecated: false,
        dataAccess: {
            collections: "*",
            fieldMasking: {},
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: "operator",
        name: "Operator",
        description: "Create and execute queries (heavy queries require Supervisor approval)",
        permissionIds: [
            "view_dashboard",
            "create_dashboard",
            "edit_dashboard",
            "share_dashboard",
            "create_query",
            "execute_query",
            "manage_spaces",
        ],
        isBuiltIn: true,
        isCustom: false,
        deprecated: false,
        dataAccess: {
            collections: "*",
            fieldMasking: {},
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: "viewer",
        name: "Viewer",
        description: "Read-only access to shared dashboards",
        permissionIds: [
            "view_dashboard",
        ],
        isBuiltIn: true,
        isCustom: false,
        deprecated: false,
        dataAccess: {
            collections: [],
            fieldMasking: {},
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

// ============================================
// MAIN
// ============================================

async function seedEnvironment() {
    if (!MONGODB_URI) {
        console.error("âŒ MONGODB_URI (or AUTH_MONGODB_URI) is not set.");
        console.error("   Make sure .env.local exists with the correct values.");
        process.exit(1);
    }
    if (!AUTH_DATABASE) {
        console.error("âŒ AUTH_DATABASE is not set.");
        console.error("   Set AUTH_DATABASE to your clean auth database name in .env.local.");
        process.exit(1);
    }
    if (!INITIAL_ADMIN_EMAIL || !INITIAL_ADMIN_PASSWORD) {
        console.error("INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set in .env.local.");
        process.exit(1);
    }

    const authDatabase = AUTH_DATABASE;

    console.log("ðŸŒ± Seed Environment â€” Initializing fresh database\n");
    console.log(`   Database: ${authDatabase}`);
    console.log(`   URI:      ${MONGODB_URI?.replace(/\/\/.*@/, "//***@")}\n`);

    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log("âœ… Connected to MongoDB\n");

        const db = client.db(authDatabase);

        // â”€â”€ Step 1: Admin User â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        console.log("â”â”â” Step 1/2: Admin User â”â”â”");
        const usersCol = db.collection("app_users");
        const adminUser = {
            email: INITIAL_ADMIN_EMAIL,
            name: INITIAL_ADMIN_NAME,
            role: "admin",
            providers: ["credentials"],
            createdAt: new Date(),
            createdBy: "system_seed",
        };
        const existing = await usersCol.findOne({ email: adminUser.email });

        if (existing) {
            console.log(`   ${adminUser.email} already exists (role: ${existing.role})`);
        } else {
            const hashedPassword = await bcrypt.hash(INITIAL_ADMIN_PASSWORD, BCRYPT_ROUNDS);
            await usersCol.insertOne({ ...adminUser, password: hashedPassword });
            console.log(`   Created ${adminUser.email}`);
        }
        console.log("");

        // â”€â”€ Step 2: Permission Sets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        console.log("â”â”â” Step 2/2: Permission Sets (4-Role RBAC) â”â”â”");
        const psCol = db.collection("permission_sets");

        for (const role of BUILT_IN_PERMISSION_SETS) {
            const existingRole = await psCol.findOne({ id: role.id, isBuiltIn: true });
            if (existingRole) {
                console.log(`   â­ï¸  ${role.name} (${role.id}) already exists`);
            } else {
                await psCol.insertOne(role);
                console.log(`   âœ… Created ${role.name} (${role.id})`);
            }
        }
        console.log("");

        // â”€â”€ Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        const userCount = await usersCol.countDocuments();
        const roleCount = await psCol.countDocuments({ isBuiltIn: true });

        console.log("â”â”â” Summary â”â”â”");
        console.log(`   ðŸ‘¤ Users in app_users: ${userCount}`);
        console.log(`   ðŸ”‘ Built-in roles:     ${roleCount}`);
        console.log("");
        console.log("ðŸŽ‰ Environment is ready! Run: npm run dev");
        console.log("");

    } catch (error) {
        console.error("âŒ Error:", error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

seedEnvironment();
