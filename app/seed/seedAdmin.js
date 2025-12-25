/*   import dotenv from "dotenv";
  import mongoose from "mongoose";
  import { connectDB } from "../config/dbConfig.js";
  import Role from "../models/user/role.js";
  import Staff from "../models/user/staff.js";

  dotenv.config();

  async function seedSuperAdmin() {
    try {
      await connectDB();

      const {
        SUPER_ADMIN_NAME,
        SUPER_ADMIN_EMAIL,
        SUPER_ADMIN_PHONE,
        SUPER_ADMIN_PASSWORD,
        SUPER_ADMIN_STAFFID,
      } = process.env;

      if (
        !SUPER_ADMIN_NAME ||
        !SUPER_ADMIN_EMAIL ||
        !SUPER_ADMIN_PHONE ||
        !SUPER_ADMIN_PASSWORD
      ) {
        throw new Error("Super admin env variables missing");
      }

      let superAdminRole = await Role.findOne({ name: "SUPER_ADMIN" });

      if (!superAdminRole) {
        superAdminRole = await Role.create({
          name: "SUPER_ADMIN",
          description: "System owner with full access",
          permissions: ["*"],
        });
        console.log("🛠 SUPER_ADMIN role created");
      }
    
      const exists = await Staff.findOne({
        $or: [{ email: SUPER_ADMIN_EMAIL }, { phone: SUPER_ADMIN_PHONE }],
      });

      if (exists) {
        console.log("⚡ Super Admin already exists");
        return process.exit(0);
      }

      await Staff.create({
        name: SUPER_ADMIN_NAME,
        email: SUPER_ADMIN_EMAIL,
        phone: SUPER_ADMIN_PHONE,
        password: SUPER_ADMIN_PASSWORD,
        role: superAdminRole._id,
        staffId: SUPER_ADMIN_STAFFID || "SA001",
      });

      console.log("👑 Super Admin created successfully");

      await mongoose.disconnect();
      process.exit(0);
    } catch (error) {
      console.error("❌ Super Admin seeding failed:", error.message);
      process.exit(1);
    }
  }

  seedSuperAdmin();
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/dbConfig.js";
import Admin from "../models/user/admin.js";

dotenv.config();

async function seedSuperAdmin() {
  try {
    await connectDB();

    const {
      SUPER_ADMIN_NAME,
      SUPER_ADMIN_EMAIL,
      SUPER_ADMIN_PHONE,
      SUPER_ADMIN_PASSWORD,
    } = process.env;

    if (
      !SUPER_ADMIN_NAME ||
      !SUPER_ADMIN_EMAIL ||
      !SUPER_ADMIN_PHONE ||
      !SUPER_ADMIN_PASSWORD
    ) {
      throw new Error("❌ Super admin env variables missing");
    }

    const exists = await Admin.findOne({
      $or: [{ email: SUPER_ADMIN_EMAIL }, { phone: SUPER_ADMIN_PHONE }],
    });

    if (exists) {
      console.log("⚡ Super Admin already exists");
      process.exit(0);
    }

    await Admin.create({
      name: SUPER_ADMIN_NAME,
      email: SUPER_ADMIN_EMAIL,
      phone: SUPER_ADMIN_PHONE,
      password: SUPER_ADMIN_PASSWORD,
      role: "SUPER_ADMIN",
    });

    console.log("👑 Super Admin created successfully");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Super Admin seeding failed:", error.message);
    process.exit(1);
  }
}

seedSuperAdmin();
