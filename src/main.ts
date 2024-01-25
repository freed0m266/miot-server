import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import "dotenv/config";
import { Server } from "ws";
import cron from "node-cron";

import deskRoutes from "./routes/desks.route";
import { generateApiKey } from "generate-api-key";

import bodyParser from "body-parser";
import { saveDataPoint } from "./services/influx.service";
import { notifyDeskChanges } from "./services/notification.service";

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

app.use(bodyParser.json());

app.use("/desks", deskRoutes);

const server = app.listen(port, async () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
  console.log(apiKey);

  // saveDataPoint(1706016645, "desk1", 250);

  // axios.get(`${process.env.REST_API_URL}/v1/messages?group_id=6554f8d6f42cee4c65a5d4c7&device_id=656aeaba2b763a192f382b0e&limit=1`, {
  //     headers: {
  //         'Authorization': `Bearer ${process.env.API_TOKEN}`
  //     }
  // })
  //     .then(res => console.log(res.data))
  //     .catch(err => console.log(err));
});

const wss = new Server({ server });

wss.on("connection", (ws) => {
  console.log("WebSocket client connected");

  ws.on("message", (message) => {
    console.log("Received message:", message);
  });

  setInterval(() => {
    ws.send("Mockovaná zpráva z WebSocket serveru");
  }, 3000);

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });
});

// cron.schedule every 5 minutes
cron.schedule("*/5 * * * *", () => {
  notifyDeskChanges();
});
