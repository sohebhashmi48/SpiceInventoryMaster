
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    host: "localhost",
    user: "root", // Replace with your MySQL username
    password: "Sudo", // Replace with your MySQL password
    database: "spice_inventory"
  },
});
