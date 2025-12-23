// import dotenv from "dotenv";
// import bcrypt from "bcrypt";
// import mongoose from "mongoose";
// import { connectDB } from "../config/dbConfig.js";
// import Role from "../models/user/role.js";
// import Staff from "../models/user/staff.js";

// dotenv.config();

// async function seedAdmin() {
//   try {
//     await connectDB();

//     const adminPhone = process.env.ADMIN_PHONE;
//     const adminPassword = process.env.ADMIN_PASSWORD;
//     const adminStaffId = process.env.ADMINSTAFFID;

//     if (!adminPhone || !adminPassword) {
//       throw new Error("⚠️ Please set ADMIN_PHONE and ADMIN_PASSWORD in your .env file");
//     }

//     let adminRole = await Role.findOne({ name: "Admin" });
//     if (!adminRole) {
//       adminRole = await Role.create({
//         name: "Admin",
//         description: "Full access to all system resources",
//         permissions: ["*"],
//       });
//       console.log("🛠 Created 'Admin' role");
//     }

//     let adminUser = await Staff.findOne({ phone: adminPhone }).select("+password");

//     if (!adminUser) {

//       adminUser = await Staff.create({
//         name: "Admin",
//         phone: adminPhone,
//         password:adminPassword ,
//         role: adminRole._id,
//         staffId: adminStaffId,
//       });

//       console.log(`👑 Created admin user with phone: ${adminPhone}`);
//     } else {
//       console.log(`⚡ Admin user already exists: ${adminPhone}`);
//     }

//     console.log("✅ Seeding completed successfully.");
//     await mongoose.disconnect();
//     process.exit(0);
//   } catch (error) {
//     console.error("❌ Seeding failed:", error);
//     process.exit(1);
//   }
// }

// seedAdmin();
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/dbConfig.js";
import Role from "../models/user/role.js";
import Staff from "../models/user/staff.js";

dotenv.config();

async function seedAdmin() {
  try {
    await connectDB();

    const names = process.env.ADMIN_NAMES?.split(",").map((n) => n.trim());
    const phones = process.env.ADMIN_PHONES?.split(",").map((p) => p.trim());
    const password = process.env.ADMIN_PASSWORD;
    const staffIdPrefix = process.env.ADMINSTAFFID_PREFIX || "ADMIN";

    if (!names || !phones || !password) {
      throw new Error("ADMIN_NAMES, ADMIN_PHONES, ADMIN_PASSWORD are required");
    }

    if (names.length !== phones.length) {
      throw new Error("ADMIN_NAMES and ADMIN_PHONES count must be equal");
    }

    let adminRole = await Role.findOne({ name: "Admin" });
    if (!adminRole) {
      adminRole = await Role.create({
        name: "Admin",
        description: "Full access",
        permissions: ["*"],
      });
      console.log("🛠 Admin role created");
    }

    for (let i = 0; i < phones.length; i++) {
      const phone = phones[i];
      const name = names[i];

      // phone validation
      if (!/^[6-9]\d{9}$/.test(phone)) {
        console.log(`❌ Invalid phone skipped: ${phone}`);
        continue;
      }

      const exists = await Staff.findOne({ phone });

      if (!exists) {
        await Staff.create({
          name,
          phone,
          password,
          role: adminRole._id,
          staffId: `${staffIdPrefix}${i + 1}`,
        });

        console.log(`👑 Admin created: ${name} (${phone})`);
      } else {
        console.log(`⚡ Admin already exists: ${phone}`);
      }
    }

    console.log("✅ Admin seeding completed");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
}

seedAdmin();
