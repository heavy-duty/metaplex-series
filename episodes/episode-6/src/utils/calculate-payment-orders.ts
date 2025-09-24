import { addMonths, getDate, getDaysInMonth, getUnixTime } from "date-fns";

export function calculatePaymentOrders(
  durationMonths: number,
  total: number,
  startDate: Date,
  paymentOrders: {
    orderNumber: number;
    status: "unclaimed" | "claimed";
  }[] = [],
) {
  const monthlyAmount = Math.floor(total / durationMonths);
  const targetDay = getDate(startDate);

  const result: {
    monthIndex: number;
    dueTimestamp: number;
    amount: number;
    orderNumber: number;
    status: "unclaimed" | "claimed";
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

    // Find matching payment order status or default to "unclaimed"
    const existingOrder = paymentOrders.find(
      (order) => order.orderNumber === i + 1,
    );
    const status = existingOrder ? existingOrder.status : "unclaimed";
    const orderNumber = existingOrder ? existingOrder.orderNumber : i + 1;

    result.push({
      monthIndex: i,
      dueTimestamp,
      amount: monthlyAmount,
      orderNumber,
      status,
    });
  }

  return result;
}
