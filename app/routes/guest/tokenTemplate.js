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
  isHospitalAdmin,
  verifyToken,
} from "../../middlewares/jwtAuth.js";

const router = express.Router();

router.use(verifyToken);

router.post("/issued", isFrontDesk, issueToken);
router.get("/frontdesk/templates", isFrontDesk, getTokenTemplates);

router.get("/issued-tokens", getAllIssuedTokens);

router.get("/issued-tokens/:id", getIssuedTokenById);
router.post("/issued", isFrontDesk, issueToken);
// router.get("/templates", getTokenTemplates);

//admin routes
router.use(verifyToken, isHospitalAdmin);

router.post("/admin/templates", createTokenTemplate);

router.get("/admin/templates/:id", getTokenTemplateById);
router.put("/admin/templates/:id", updateTokenTemplate);
router.delete("/admin/templates/:id", deleteTokenTemplate);

router.get("/templates", getTokenTemplates);

router.get("/issued-tokens", getAllIssuedTokens);

router.get("/issued-tokens/:id", getIssuedTokenById);

export default router;
