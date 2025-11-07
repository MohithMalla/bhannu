import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

import auctionRoutes from "./routes/auction.js";
import orderRoutes from "./routes/orders.js";
import itemRoutes from "./routes/items.js";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.set("io", io);

io.on("connection", socket => {
  socket.on("join_item", item_id => socket.join(item_id));
});

app.use("/items", itemRoutes);
app.use("/auction", auctionRoutes);
app.use("/order", orderRoutes);

server.listen(5000, () =>
  console.log("✅ Backend running http://localhost:5000")
);
