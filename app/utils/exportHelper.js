import ExcelJS from "exceljs";
import { Parser } from "json2csv";

export const exportToCSV = (data, fileName = "export.csv", res) => {
  if (!data.length) return res.status(404).json({ message: "No data found" });

  const parser = new Parser({ fields: Object.keys(data[0]) });
  const csv = parser.parse(data);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
  return res.status(200).send(csv);
};


export const exportToExcel = async (data, fileName = "export.xlsx", res) => {
  if (!data.length) return res.status(404).json({ message: "No data found" });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Export");

  sheet.columns = Object.keys(data[0]).map((key) => ({
    header: key,
    key,
    width: 20,
  }));

  data.forEach((row) => sheet.addRow(row));

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

  await workbook.xlsx.write(res);
  res.end();
};


export const flattenPatientsForExcel = (groupedPatients) => {
  const rows = [];
  groupedPatients.forEach(group => {
    group.patients.forEach(p => {
      rows.push({
        PatientName: p.patientName,
        PatientId: p.patientId,
        Mobile: group.mobile,
        Gender: p.gender,
        Age: p.age,
        Address: p.address,
        PatientType: p.currentPatientType,
        VisitCount: p.visitCount,
        // LastDoctor: p.lastDoctor?.doctorName || "",
        // LatestInvoiceAmount: p.latestInvoiceAmount,
        // LatestPaymentMethod: p.latestPaymentMethod,
        // PrepaidPackageName: p.prepaidPackage?.packageName || "",
        // PrepaidTotalFee: p.prepaidPackage?.totalFee || "",
        // LatestDepartment: p.latestDepartment
      });
    });
  });
  return rows;
};


export const flattenAccountSummariesForExcel = (summaries) => {
  return summaries.map((s) => ({
    Frontdesk: s.frontdesk?.name || "N/A",
    Role: s.frontdesk?.role?.name || "N/A",
    Date: new Date(s.date).toLocaleDateString(),
    TotalAmount: s.totalAmount || 0,
    TotalCashAmount: s.totalCashAmount || 0,
    TotalOnlineAmount: s.totalOnlineAmount || 0,
    TotalGuestAmount: s.totalGuestAmount || 0,
    TotalPatientAmount: s.totalPatientAmount || 0,
    TotalCanteenAmount: s.totalCanteenAmount || 0,
    TransactionStatus: s.transactionStatus || "N/A",
    // Status: s.status || "N/A",
    // CreatedAt: new Date(s.createdAt).toLocaleString(),
  }));
};
