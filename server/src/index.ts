import "./loadEnv";
import cors from "cors";
import express from "express";
import authRoutes from "./routes/auth";
import adminAuthRoutes from "./routes/adminAuth";
import adminUsersRoutes from "./routes/adminUsers";
import adminPackagesRoutes from "./routes/adminPackages";
import adminBookingsRoutes from "./routes/adminBookings";
import adminPaymentsRoutes from "./routes/adminPayments";
import adminClientsRoutes from "./routes/adminClients";
import packagesRoutes from "./routes/packages";
import bookingsRoutes from "./routes/bookings";
import paymentsRoutes from "./routes/payments";
import mpesaRoutes from "./routes/mpesa";
import currencyRoutes from "./routes/currency";
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
app.use("/api/bookings", bookingsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/mpesa", mpesaRoutes);
app.use("/api/currency", currencyRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/packages", adminPackagesRoutes);
app.use("/api/admin/bookings", adminBookingsRoutes);
app.use("/api/admin/payments", adminPaymentsRoutes);
app.use("/api/admin/clients", adminClientsRoutes);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
