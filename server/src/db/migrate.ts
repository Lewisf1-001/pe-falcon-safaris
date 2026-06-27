import "../loadEnv";
import fs from "fs";
import path from "path";
import { Pool } from "pg";

async function migrate() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const sqlFiles = [
    path.join(__dirname, "schema.sql"),
    ...fs
      .readdirSync(path.join(__dirname, "migrations"))
      .filter((file) => file.endsWith(".sql"))
      .sort()
      .map((file) => path.join(__dirname, "migrations", file)),
  ];

  try {
    for (const filePath of sqlFiles) {
      const sql = fs.readFileSync(filePath, "utf-8");
      await pool.query(sql);
      console.log(`Applied ${path.basename(filePath)}`);
    }

    console.log("Database migration completed successfully.");
  } finally {
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
