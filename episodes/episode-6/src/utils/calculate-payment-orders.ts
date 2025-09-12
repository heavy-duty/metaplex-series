import { addMonths, getDate, getDaysInMonth, getUnixTime } from "date-fns";

export function calculatePaymentOrders(
  durationMonths: number,
  total: number,
  startDate: Date
) {
  const monthlyAmount = Math.floor(total / durationMonths);

  // Extract day of month
  const targetDay = getDate(startDate);

  const paymentOrders: {
    monthIndex: number;
    dueTimestamp: number;
    amount: number;
    status: "unclaimed" | "claimed" | "skipped";
  }[] = [];

  for (let i = 0; i < durationMonths; i++) {
    // Add i months to start date
    const dueDate = addMonths(startDate, i);
    // Adjust if targetDay exceeds month length
    const daysInMonth = getDaysInMonth(dueDate);
    const adjustedDay = targetDay > daysInMonth ? daysInMonth : targetDay;
    const adjustedDueDate = new Date(dueDate.setDate(adjustedDay));
    // Convert to Unix timestamp
    const dueTimestamp = getUnixTime(adjustedDueDate);

    paymentOrders.push({
      monthIndex: i,
      dueTimestamp,
      amount: monthlyAmount,
      status: "unclaimed",
    });
  }

  return paymentOrders;
}
