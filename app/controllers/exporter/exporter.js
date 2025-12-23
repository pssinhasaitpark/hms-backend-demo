import {  exportToExcel } from "../../utils/exportHelper.js";
import { getAllPatientsForAdmin } from "../frontdesk/patients.js";
import { flattenPatientsForExcel,flattenAccountSummariesForExcel } from "../../utils/exportHelper.js";
import { getAllAccountSummaries } from "../accounts/accountDailySummary.js";

export const exportPatientsExcel = async (req, res) => {
  try {
    let capturedResponse = null;

    
    const fakeRes = {
      status: () => fakeRes,
      json: (data) => {
        capturedResponse = data;
        return data;
      }
    };

    await getAllPatientsForAdmin(req, fakeRes);

    const patientsData = capturedResponse?.data?.patients || [];

    if (!patientsData.length) {
      return res.status(404).json({ message: "No patients found" });
    }

    const rows = flattenPatientsForExcel(patientsData);

    await exportToExcel(rows, "patients_export.xlsx", res);
  } catch (error) {
    console.error("Excel export failed:", error);
    return res.status(500).json({ message: "Excel export failed" });
  }
};



export const exportAccountSummariesExcel = async (req, res) => {
  try {
    let capturedResponse = null;

    const fakeRes = {
      status: () => fakeRes,
      json: (data) => {
        capturedResponse = data;
        return data;
      }
    };

    // Fetch summaries using existing controller
    await getAllAccountSummaries(req, fakeRes);

    const summariesData = capturedResponse?.data?.summaries || [];

    if (!summariesData.length) {
      return res.status(404).json({ message: "No account summaries found" });
    }

    const rows = flattenAccountSummariesForExcel(summariesData);

    await exportToExcel(rows, "account_summaries.xlsx", res);
  } catch (error) {
    console.error("Excel export failed:", error);
    return res.status(500).json({ message: "Excel export failed" });
  }
};