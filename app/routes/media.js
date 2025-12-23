import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

export default (app) => {
  router.get("/media/images/:name", (req, res) => {
    const { name } = req.params;

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const filePath = path.join(__dirname, "../uploads/images", name);

    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("File fetch error:", err);
        res.status(404).send("File not found");
      }
    });
  });


  router.get("/media/documents/:name", (req, res) => {
    const { name } = req.params;

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const filePath = path.join(__dirname, "../uploads/files", name);

    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("File fetch error:", err);
        res.status(404).send("File not found");
      }
    });
  });

  app.use("/", router);
};
