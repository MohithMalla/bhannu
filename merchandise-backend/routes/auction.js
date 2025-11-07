import express from "express";
import supabase from "../db.js";

const router = express.Router();

// ... (GET /items and POST /start routes are unchanged) ...

router.get("/items", async (req, res) => {
  try {
    const { data: items, error } = await supabase
      .from("items")
      .select("id, name, description, base_price, image_url, created_at");

    if (error) return res.status(400).json({ error });

    const { data: bids } = await supabase
      .from("bids")
      .select("item_id, bid_amount")
      .order("bid_amount", { ascending: false });

    const highest = {};
    for (const b of bids) {
      if (!highest[b.item_id]) highest[b.item_id] = b.bid_amount;
    }

    const list = items.map(i => ({
      ...i,
      highest_bid: highest[i.id] || i.base_price
    }));

    res.json({ items: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/start", async (req, res) => {
  try {
    const { item_id, start_price } = req.body;
    if (!item_id || start_price == null)
      return res.status(400).json({ error: "item_id & start_price required" });

    const { data, error } = await supabase
      .from("bids")
      .insert([{ item_id, bid_amount: start_price }])
      .select();

    if (error) return res.status(400).json({ error });
    res.json({ message: "Auction started", opening_bid: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ THIS ROUTE IS NOW FULLY CORRECTED
router.post("/bid", async (req, res) => {
  try {
    const { item_id, user_id, bid_amount } = req.body;

    if (!item_id || !user_id || bid_amount == null)
      return res.status(400).json({ error: "item_id, user_id, bid_amount required" });

    // 1. Check highest bid
    const { data: high } = await supabase
      .from("bids")
      .select("bid_amount")
      .eq("item_id", item_id)
      .order("bid_amount", { ascending: false })
      .limit(1);

    if (high?.length && bid_amount <= high[0].bid_amount)
      return res.status(400).json({ error: "Bid must be higher" });

    // 2. Insert the new bid
    const { data, error: insertError } = await supabase
      .from("bids")
      .insert([{ item_id, user_id, bid_amount }])
      .select();

    if (insertError) {
      console.error("Supabase insert error:", insertError.message);
      return res.status(400).json({ error: insertError.message });
    }

    if (!data || data.length === 0) {
      console.error("Failed to insert bid, no data returned.");
nbsp;     return res.status(500).json({ error: "Failed to record bid." });
    }

    const bid = data[0];

    // 3. ✅ NEW: Update the auction's current_bid field
    // This is the logic that was missing from the backend.
    const { error: updateError } = await supabase
      .from('auctions')
      .update({ current_bid: bid_amount })
      .eq('id', item_id);

    if (updateError) {
      // Log this error, but don't stop the request.
      // The bid was placed successfully, which is the most critical part.
      console.error("Failed to update auction current_bid:", updateError.message);
    }

    // 4. Broadcast the successful bid
    const io = req.app.get("io");
    if (io) {
      io.to(item_id).emit("new_bid", bid);
      io.emit("auction_update", bid);
    }

    res.json({ message: "Bid placed", bid });
  } catch (err) {
    console.error("Unhandled error in /bid route:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ... (GET /item/:item_id/highest route is unchanged) ...
router.get("/item/:item_id/highest", async (req, res) => {
  try {
    const { item_id } = req.params;
    const { data } = await supabase
      .from("bids")
      .select("id, user_id, bid_amount")
      .eq("item_id", item_id)
      .order("bid_amount", { ascending: false })
      .limit(1);

    res.json({ highest: data?.[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;