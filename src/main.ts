import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import axios from "axios";

import deskRoutes from "./routes/desks.route";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.use("/desks", deskRoutes);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);

  // axios.get(`${process.env.REST_API_URL}/v1/messages?group_id=6554f8d6f42cee4c65a5d4c7&device_id=656aeaba2b763a192f382b0e&limit=1`, {
  //     headers: {
  //         'Authorization': `Bearer ${process.env.API_TOKEN}`
  //     }
  // })
  //     .then(res => console.log(res.data))
  //     .catch(err => console.log(err));
});
