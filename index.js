import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import morgan from "morgan";
import { connectDB } from "./app/config/dbConfig.js";
import routes from "./app/routes/index.js";
import mediaSetup from "./app/routes/media.js";
dotenv.config();

const app = express();
const host = process.env.HOST;
const port = process.env.PORT || 0;

// app.use(morgan("dev"));

app.use(
  cors({
    origin: [
      "http://192.168.0.141:5173",
      "https://madhav-web.parkhya.co.in",
      "https://madhav-admin.parkhya.co.in",
      "http://192.168.0.141:5174",
      "http://192.168.0.162:5173",
      "http://192.168.0.146:5173",
      "https://hms-admin-demo.vercel.app",
      "https://hms-admin-demo-8aps.vercel.app",
      "https://hms-web-app-demo.vercel.app",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://192.168.0.139:5173",
      "http://192.168.0.164:5173",
    ],
    methods: ["GET", "POST", "HEAD", "PUT", "PATCH", "DELETE"],
    optionsSuccessStatus: 200,
    credentials: true,
  })
);

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(express.json());

connectDB();
mediaSetup(app);
routes(app);

app.get("/", (req, res) => {
  return res.status(200).send({
    error: false,
    message: "Guruji Sewa Nyas Apis's",
  });
});

app.listen(port, host, () =>
  console.log(`App is listening at port: http://${host}:${port}`)
);

// app.listen(port,   () =>
//   console.log(`App is listening at port: http://localhost:${port}`)
// );
