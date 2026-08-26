/**
 * Create an Operator user for testing the heavy-query approval flow.
 *
 * An operator with a RED-tier query gets blocked and must request Supervisor
 * approval (see app/actions/secure-query-assistant.ts).
 *
 * Usage:
 *   npm run create-operator
 */

import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.AUTH_MONGODB_URI || process.env.MONGODB_URI;
const AUTH_DATABASE = process.env.AUTH_DATABASE;
const BCRYPT_ROUNDS = 12;
const OPERATOR_EMAIL = process.env.OPERATOR_EMAIL;
const OPERATOR_PASSWORD = process.env.OPERATOR_PASSWORD;
const OPERATOR_NAME = process.env.OPERATOR_NAME || "Operator";

async function createOperator() {
    if (!MONGODB_URI) {
        console.error("❌ AUTH_MONGODB_URI / MONGODB_URI is not set in .env.local");
        process.exit(1);
    }
    if (!AUTH_DATABASE) {
        console.error("❌ AUTH_DATABASE is not set in .env.local");
        process.exit(1);
    }
    if (!OPERATOR_EMAIL || !OPERATOR_PASSWORD) {
        console.error("❌ OPERATOR_EMAIL and OPERATOR_PASSWORD must be set in .env.local");
        process.exit(1);
    }

    console.log("👷 Creating Operator user\n");
    console.log(`   Database: ${AUTH_DATABASE}`);
    console.log(`   URI:      ${MONGODB_URI.replace(/\/\/.*@/, "//***@")}\n`);

    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        const db = client.db(AUTH_DATABASE);
        const users = db.collection("app_users");
        const operatorUser = {
            email: OPERATOR_EMAIL,
            name: OPERATOR_NAME,
            role: "operator",
            providers: ["credentials"],
            createdAt: new Date(),
            createdBy: "system_seed",
        };

        const existing = await users.findOne({ email: operatorUser.email });
        if (existing) {
            console.log(`⏭️  ${operatorUser.email} already exists (role: ${existing.role})`);
            return;
        }

        const password = await bcrypt.hash(OPERATOR_PASSWORD, BCRYPT_ROUNDS);
        const result = await users.insertOne({ ...operatorUser, password });

        console.log("✅ Operator user created!\n");
        console.log(`   📧 Email:    ${operatorUser.email}`);
        console.log(`   👤 Role:     operator`);
        console.log(`   🆔 ID:       ${result.insertedId}\n`);
        console.log("ℹ️  Heavy (RED-tier) queries from this user will require Supervisor approval.");
    } catch (error) {
        console.error("❌ Error creating operator:", error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

createOperator();
