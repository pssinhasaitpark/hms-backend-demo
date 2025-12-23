import AccountDailySummary from "../models/frontdesk/accountDailySummary.js";



// export const updateAccountDailySummary = async (
//   frontdeskId,

//   patientCash = 0,
//   patientOnline = 0,

//   guestCash = 0,
//   guestOnline = 0,

//   canteenCash = 0,
//   canteenOnline = 0
// ) => {
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);

//   const totalCash = patientCash + guestCash + canteenCash;

//   const totalOnline = patientOnline + guestOnline + canteenOnline;

//   const totalAmount = totalCash + totalOnline;

//   let summary = await AccountDailySummary.findOne({
//     frontdesk: frontdeskId,
//     date: today,
//   }).sort({ createdAt: -1 });

//   // Create new summary if not exist
//   if (
//     !summary ||
//     summary.transactionStatus === "submitted" ||
//     summary.transactionStatus === "received"
//   ) {
//     summary = new AccountDailySummary({
//       frontdesk: frontdeskId,
//       date: today,

//       totalAmount,
//       totalCashAmount: totalCash,
//       totalOnlineAmount: totalOnline,

//       totalGuestAmount: guestCash + guestOnline,
//       totalPatientAmount: patientCash + patientOnline,

//       patientCashAmount: patientCash,
//       patientOnlineAmount: patientOnline,

//       guestCashAmount: guestCash,
//       guestOnlineAmount: guestOnline,

//       canteenCashAmount: canteenCash,
//       canteenOnlineAmount: canteenOnline,

//       transactionStatus: "pending",
//     });

//     await summary.save();
//     return summary;
//   }

//   // -------------------------------
//   // Update old summary
//   // -------------------------------

//   summary.totalAmount += totalAmount;

//   summary.totalCashAmount += totalCash;
//   summary.totalOnlineAmount += totalOnline;

//   summary.totalGuestAmount += guestCash + guestOnline;
//   summary.totalPatientAmount += patientCash + patientOnline;

//   summary.patientCashAmount += patientCash;
//   summary.patientOnlineAmount += patientOnline;

//   summary.guestCashAmount += guestCash;
//   summary.guestOnlineAmount += guestOnline;

//   summary.canteenCashAmount += canteenCash;
//   summary.canteenOnlineAmount += canteenOnline;

//   await summary.save();
//   return summary;
// };



export const updateAccountDailySummary = async (
  frontdeskId,

  patientCash = 0,
  patientOnline = 0,

  guestCash = 0,
  guestOnline = 0,

  canteenCash = 0,
  canteenOnline = 0
) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalCash = patientCash + guestCash + canteenCash;
  const totalOnline = patientOnline + guestOnline + canteenOnline;

  const totalAmount = totalCash + totalOnline;
  const totalCanteenAmount = canteenCash + canteenOnline;

  let summary = await AccountDailySummary.findOne({
    frontdesk: frontdeskId,
    date: today,
  }).sort({ createdAt: -1 });

  // Create new summary if not exist or submitted
  if (!summary || summary.transactionStatus === "submitted" || summary.transactionStatus === "received") {
    summary = new AccountDailySummary({
      frontdesk: frontdeskId,
      date: today,

      totalAmount,
      totalCashAmount: totalCash,
      totalOnlineAmount: totalOnline,

      totalGuestAmount: guestCash + guestOnline,
      totalPatientAmount: patientCash + patientOnline,
      totalCanteenAmount, // <-- new

      patientCashAmount: patientCash,
      patientOnlineAmount: patientOnline,

      guestCashAmount: guestCash,
      guestOnlineAmount: guestOnline,

      canteenCashAmount: canteenCash,
      canteenOnlineAmount: canteenOnline,

      transactionStatus: "pending",
    });

    await summary.save();
    return summary;
  }

  // Update existing summary
  summary.totalAmount += totalAmount;
  summary.totalCashAmount += totalCash;
  summary.totalOnlineAmount += totalOnline;

  summary.totalGuestAmount += guestCash + guestOnline;
  summary.totalPatientAmount += patientCash + patientOnline;
  summary.totalCanteenAmount += totalCanteenAmount; // <-- new

  summary.patientCashAmount += patientCash;
  summary.patientOnlineAmount += patientOnline;

  summary.guestCashAmount += guestCash;
  summary.guestOnlineAmount += guestOnline;

  summary.canteenCashAmount += canteenCash;
  summary.canteenOnlineAmount += canteenOnline;

  await summary.save();
  return summary;
};
