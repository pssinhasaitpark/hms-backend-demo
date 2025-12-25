//frontdesk
import staffAuthPublicRoutes from "../routes/user/staff.js";
import frontdeskRoutes from "../routes/frontdesk/patientsManagement.js";
import guestDetailsRoutes from "../routes/guest/guestDetails.js";
import tokenTemplateRoutes from "../routes/guest/tokenTemplate.js";

//admin routes
import opdRegistrationFeeRoutes from "../routes/admin/opdRegistrationFee.js";
import registrationFeeRoutes from "../routes/admin/registrationFees.js";
import staffRoutes from "../routes/admin/staff.js";
import departmentsRoutes from "../routes/admin/departments.js";
import servicesRoutes from "../routes/admin/services.js";
import doctorRoutes from "../routes/admin/doctor.js";
import roleManagementRoutes from "../routes/admin/roleManagement.js";
import adminPatienRoutes from "../routes/admin/patient.js";
import adminCompounderRoutes from "../routes/admin/compounder.js";
import adminGuestRoomRoutes from "../routes/guest/guestRoom.js";
import packageRoutes from "../routes/admin/package.js";
import exportRoutes from "../routes/exporter/exporter.js";
//compounder
import compounderDoctorManagementRoutes from "../routes/compounder/doctorandpatientManagement.js";
import prescriptionRoutes from "../routes/compounder/prescription.js";

//accounts
import accountDailySummaryRoutes from "../routes/accounts/accountDailySummary.js";

import reportsRoutes from "../routes/reports/reports.js";

//super-admin routes
import superAdminAuthRoutes from "../routes/super-admin/auth.js";
import hospitalRoutes from "../routes/hospitals/hospitals.js";

export default (app) => {
  app.use("/api/v1/auth", staffAuthPublicRoutes);
  //frontdesk
  app.use("/api/v1/frontdesk", frontdeskRoutes);
  app.use("/api/v1/guest", guestDetailsRoutes);
  app.use("/api/v1/token", tokenTemplateRoutes);

  //accounts
  app.use("/api/v1/accounts", accountDailySummaryRoutes);

  //compounder
  app.use("/api/v1/compounder", compounderDoctorManagementRoutes);
  app.use("/api/v1/prescriptions", prescriptionRoutes);

  app.use("/api/v1/reports", reportsRoutes);

  //admin routes
  app.use("/api/v1/admin/roles", roleManagementRoutes);
  app.use("/api/v1/admin/departments", departmentsRoutes);
  app.use("/api/v1/admin/services", servicesRoutes);
  app.use("/api/v1/admin/doctor", doctorRoutes);
  app.use("/api/v1/admin/opd-registration-fee", opdRegistrationFeeRoutes);
  app.use("/api/v1/admin/registration-fee", registrationFeeRoutes);
  app.use("/api/v1/admin/patients", adminPatienRoutes);
  app.use("/api/v1/admin/compounder", adminCompounderRoutes);
  app.use("/api/v1/admin/rooms", adminGuestRoomRoutes);
  app.use("/api/v1/admin/accounts", accountDailySummaryRoutes);

  app.use("/api/v1/admin/", staffRoutes);
  app.use("/api/v1/admin/packages", packageRoutes);

  app.use("/api/v1/admin/export", exportRoutes);

  //super admin routes
  app.use("/api/v1/super-admin/auth", superAdminAuthRoutes);
  app.use("/api/v1/hospital", hospitalRoutes);
};
