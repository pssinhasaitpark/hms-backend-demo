import express from "express";
import {
  createTokenTemplate,
  getTokenTemplates,
  getTokenTemplateById,
  updateTokenTemplate,
  deleteTokenTemplate,
  issueToken,
  getAllIssuedTokens,
  getIssuedTokenById,
} from "../../controllers/guest/tokenTemplate.js";
import {
  isAdmin,
  isFrontDesk,
  verifyToken,
} from "../../middlewares/jwtAuth.js";

const router = express.Router();

router.use(verifyToken);

router.post("/admin/templates", isAdmin, createTokenTemplate);

router.get("/admin/templates/:id", getTokenTemplateById);
router.put("/admin/templates/:id", isAdmin, updateTokenTemplate);
router.delete("/admin/templates/:id", deleteTokenTemplate);

router.get("/templates", getTokenTemplates);

router.post("/issued", isFrontDesk, issueToken);
router.get("/issued-tokens", getAllIssuedTokens);

router.get("/issued-tokens/:id", getIssuedTokenById);

export default router;
