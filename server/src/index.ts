import "./loadEnv";
import cors from "cors";
import express from "express";
import authRoutes from "./routes/auth";
import adminAuthRoutes from "./routes/adminAuth";
import adminUsersRoutes from "./routes/adminUsers";
import adminPackagesRoutes from "./routes/adminPackages";
import packagesRoutes from "./routes/packages";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const port = Number(process.env.PORT) || 4000;
const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
const adminUrl = process.env.ADMIN_URL || "http://localhost:3001";
const allowedOrigins = [clientUrl, adminUrl];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/packages", packagesRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/packages", adminPackagesRoutes);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
