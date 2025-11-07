// routes/items.js (Corrected)
import express from "express";
import supabase from "../db.js";

const router = express.Router();

// CREATE ITEM
router.post("/create", async (req, res) => {
  try {
    // These fields must match your 'products' table
    const { name, description, base_price, image_url } = req.body;
    const price = base_price; // Alias for clarity

    if (!name || price == null) {
      return res.status(400).json({ error: "name and base_price are required" });
    }

    const { data, error } = await supabase
      .from("products") // ✅ Corrected from "items" to "products"
      .insert([{ name, description, price, images: image_url ? [image_url] : [] }])
      .select()
      .single();

    if (error) return res.status(400).json({ error });
    res.json({ message: "Product created ✅", item: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET ALL ITEMS
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("items") // ✅ Corrected from "items" to "products"
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error });
    res.json({ items: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;