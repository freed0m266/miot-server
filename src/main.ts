import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import "dotenv/config";
import { Server } from "ws";
import cors from "cors";

import deskRoutes from "./routes/desks.route";
import { generateApiKey } from "generate-api-key";

import bodyParser from "body-parser";
import { notifyDeskChanges } from "./services/notification.service";
import zonesRoute from "./routes/zones.route";
import defaultRoute from "./routes/default.route";
import dataRoute from "./routes/data.route";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;
export const apiKey = generateApiKey({
  method: "uuidv4",
  prefix: process.env.BUILDING_ID || undefined,
});

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.use(cors());
app.use(bodyParser.json());

app.use("/default", defaultRoute);
app.use("/desks", deskRoutes);
app.use("/zones", zonesRoute);
app.use("/data", dataRoute);

const server = app.listen(port, async () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
  console.log(apiKey);
});

const wss = new Server({ server });

wss.on("connection", (ws) => {
  console.log("WebSocket client connected");

  ws.on("message", (message) => {
    console.log("Received message:", message);
  });

  const interval = setInterval(async () => {
    if (ws.readyState === ws.OPEN) {
      const notificationMessage = await notifyDeskChanges();
      ws.send(notificationMessage);
    }
  }, 6000);

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
    clearInterval(interval);
  });
});
