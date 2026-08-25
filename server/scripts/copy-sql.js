const fs = require("fs");
const path = require("path");

const srcDb = path.join(__dirname, "..", "src", "db");
const distDb = path.join(__dirname, "..", "dist", "db");
const srcMigrations = path.join(srcDb, "migrations");
const distMigrations = path.join(distDb, "migrations");

fs.mkdirSync(distMigrations, { recursive: true });

for (const file of fs.readdirSync(srcDb)) {
  if (file.endsWith(".sql")) {
    fs.copyFileSync(path.join(srcDb, file), path.join(distDb, file));
  }
}

for (const file of fs.readdirSync(srcMigrations)) {
  if (file.endsWith(".sql")) {
    fs.copyFileSync(path.join(srcMigrations, file), path.join(distMigrations, file));
  }
}

console.log("Copied SQL schema and migrations into dist/db");
