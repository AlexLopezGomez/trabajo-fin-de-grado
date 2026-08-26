/**
 * Create admin user for Enterprise
 * Run with: npm run create-admin
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

async function createAdmin() {
    console.log("ðŸ”‘ Creating admin user...\n");

    if (!MONGODB_URI) {
        throw new Error("AUTH_MONGODB_URI or MONGODB_URI environment variable is not set");
    }

    if (!AUTH_DATABASE) {
        throw new Error("AUTH_DATABASE environment variable is not set");
    }
    if (!INITIAL_ADMIN_EMAIL || !INITIAL_ADMIN_PASSWORD) {
        throw new Error("INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set in .env.local");
    }

    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log("âœ… Connected to MongoDB");
        console.log(`   Database: ${AUTH_DATABASE}\n`);

        const db = client.db(AUTH_DATABASE);
        const collection = db.collection("app_users");

        // Check if admin user already exists
        const existingAdmin = await collection.findOne({ email: INITIAL_ADMIN_EMAIL });

        if (existingAdmin) {
            console.log(`Admin user ${INITIAL_ADMIN_EMAIL} already exists.`);
            console.log(`   Role: ${existingAdmin.role}`);
            console.log(`   Created: ${existingAdmin.createdAt}`);
            return;
        }

        // Create admin user with the current schema
        const adminUser = {
            email: INITIAL_ADMIN_EMAIL,
            password: await bcrypt.hash(INITIAL_ADMIN_PASSWORD, BCRYPT_ROUNDS),
            name: INITIAL_ADMIN_NAME,
            role: "admin",
            providers: ["credentials"],
            createdAt: new Date(),
            createdBy: "system_seed",
        };

        const result = await collection.insertOne(adminUser);

        console.log("âœ… Admin user created successfully!\n");
        console.log(`   Email: ${INITIAL_ADMIN_EMAIL}`);
        console.log("   ðŸ‘¤ Role: admin");
        console.log(`   ðŸ†” ID: ${result.insertedId}`);
        console.log("\nYou can now sign in with the configured credentials.\n");

    } catch (error) {
        console.error("âŒ Error creating admin:", error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

createAdmin();
