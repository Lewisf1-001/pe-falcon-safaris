import { Router } from "express";
import { getUsdRates, SUPPORTED_CURRENCIES } from "../services/currency";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    base: "USD",
    currencies: SUPPORTED_CURRENCIES,
    rates: getUsdRates(),
  });
});

export default router;
