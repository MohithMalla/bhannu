import express from "express";
import supabase from "../db.js";

const router = express.Router();

// Create order when auction closes
router.post("/create", async (req, res) => {
  try {
    const { user_id, item_id, price } = req.body;

    if (!user_id || !item_id || price == null)
      return res.status(400).json({ error: "user_id, item_id, price required" });

    const { data } = await supabase
      .from("orders")
      .insert([{ user_id, item_id, price }])
      .select();

    res.json({ message: "Order created", order: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
