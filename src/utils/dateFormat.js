// export const todayStr = () => {
//   return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
// }

export const todayStr = () => {
  const now = new Date();

  // Convert to IST (UTC + 5:30)
  const istTime = new Date(
    now.getTime() + (5 * 60 + 30) * 60 * 1000
  );

  const yyyy = istTime.getFullYear();
  const mm = String(istTime.getMonth() + 1).padStart(2, "0");
  const dd = String(istTime.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

export const parseTaskDate = (dateStr) => {
  if (!dateStr) return null;
  if (typeof dateStr !== "string") return new Date(dateStr);

  let finalStr = dateStr;

  // Regex to check for timezone (Z or +/-HH:mm or +/-HHmm or +/-HH)
  const hasTimezone = /(Z|[+-]\d{2}(:?\d{2})?)$/.test(dateStr);

  if (!hasTimezone) {
    // No timezone provided, assume IST
    finalStr = dateStr.includes("T") ? `${dateStr}+05:30` : `${dateStr}T00:00:00+05:30`;
  }

  const date = new Date(finalStr);
  return isNaN(date.getTime()) ? new Date(dateStr) : date; // Fallback to original parsing if manual failed
};
