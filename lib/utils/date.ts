export type DateFormatStyle = "short" | "long" | "full";

export const formatDate = (date: Date, style: DateFormatStyle = "short") => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const dateStyle: Intl.DateTimeFormatOptions["dateStyle"] =
    style === "full" ? "full" : style === "long" ? "medium" : "short";

  return new Intl.DateTimeFormat("en-US", { dateStyle }).format(date);
};

export const formatTime = (date: Date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", { timeStyle: "short" }).format(date);
};
