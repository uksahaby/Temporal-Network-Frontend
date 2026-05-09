/**
 * Date formatting utilities for temporal network visualization
 */

export type DateFormat = "short" | "long" | "full" | "relative";

/**
 * Format a date for display
 */
export function formatDate(
  date: Date | number,
  format: DateFormat = "short",
): string {
  const dateObj = typeof date === "number" ? new Date(date) : date;

  switch (format) {
    case "short":
      return dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    case "long":
      return dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    case "full":
      return dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    case "relative":
      return formatRelativeTime(dateObj);
    default:
      return dateObj.toISOString();
  }
}

/**
 * Format time for display
 */
export function formatTime(
  date: Date | number,
  includeSeconds: boolean = false,
): string {
  const dateObj = typeof date === "number" ? new Date(date) : date;

  return dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: includeSeconds ? "2-digit" : undefined,
  });
}

/**
 * Format a time range
 */
export function formatTimeRange(
  start: Date | number,
  end: Date | number,
  format: DateFormat = "short",
): string {
  const startDate = typeof start === "number" ? new Date(start) : start;
  const endDate = typeof end === "number" ? new Date(end) : end;

  if (format === "relative") {
    return `${formatRelativeTime(startDate)} - ${formatRelativeTime(endDate)}`;
  }

  return `${formatDate(startDate, format)} - ${formatDate(endDate, format)}`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | number): string {
  const now = new Date();
  const dateObj = typeof date === "number" ? new Date(date) : date;
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffYear > 0) {
    return `${diffYear} year${diffYear > 1 ? "s" : ""} ago`;
  } else if (diffMonth > 0) {
    return `${diffMonth} month${diffMonth > 1 ? "s" : ""} ago`;
  } else if (diffWeek > 0) {
    return `${diffWeek} week${diffWeek > 1 ? "s" : ""} ago`;
  } else if (diffDay > 0) {
    return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  } else if (diffHour > 0) {
    return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  } else if (diffMin > 0) {
    return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  } else if (diffSec > 30) {
    return `${diffSec} seconds ago`;
  } else {
    return "just now";
  }
}

/**
 * Format duration in milliseconds
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Parse date string to timestamp
 * Supports multiple date formats
 */
export function parseDate(dateStr: string): number | null {
  if (!dateStr) return null;

  // Try ISO format first
  const isoDate = Date.parse(dateStr);
  if (!isNaN(isoDate)) return isoDate;

  // Try common formats
  const formats = [
    "YYYY-MM-DD HH:mm:ss",
    "YYYY/MM/DD HH:mm:ss",
    "MM/DD/YYYY HH:mm:ss",
    "DD/MM/YYYY HH:mm:ss",
    "YYYY-MM-DD",
    "YYYY/MM/DD",
  ];

  for (const format of formats) {
    const date = parseWithFormat(dateStr, format);
    if (date) return date.getTime();
  }

  return null;
}

/**
 * Parse date with specific format
 */
function parseWithFormat(dateStr: string, format: string): Date | null {
  // Simple format parser for common patterns
  const parts = dateStr.split(/[\s\/:-]+/);
  const formatParts = format.split(/[\s\/:-]+/);

  if (parts.length !== formatParts.length) return null;

  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;
  let hour = 0;
  let minute = 0;
  let second = 0;

  for (let i = 0; i < formatParts.length; i++) {
    const formatPart = formatParts[i];
    const value = parseInt(parts[i], 10);

    if (isNaN(value)) return null;

    switch (formatPart) {
      case "YYYY":
        year = value;
        break;
      case "MM":
        month = value - 1; // JavaScript months are 0-indexed
        break;
      case "DD":
        day = value;
        break;
      case "HH":
        hour = value;
        break;
      case "mm":
        minute = value;
        break;
      case "ss":
        second = value;
        break;
    }
  }

  if (year === null || month === null || day === null) return null;

  return new Date(year, month, day, hour, minute, second);
}

/**
 * Get time intervals for aggregation
 */
export function getTimeIntervals(
  start: number,
  end: number,
  numIntervals: number = 10,
): number[] {
  const interval = (end - start) / numIntervals;
  const intervals = [];

  for (let i = 0; i <= numIntervals; i++) {
    intervals.push(start + i * interval);
  }

  return intervals;
}

/**
 * Snap time to nearest interval
 */
export function snapToInterval(
  time: number,
  intervalMs: number,
  method: "floor" | "ceil" | "round" = "round",
): number {
  const snapped = Math[method](time / intervalMs) * intervalMs;
  return snapped;
}

/**
 * Check if two time ranges overlap
 */
export function timeRangesOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number,
): boolean {
  return start1 <= end2 && start2 <= end1;
}

/**
 * Calculate overlap duration between two time ranges
 */
export function getOverlapDuration(
  start1: number,
  end1: number,
  start2: number,
  end2: number,
): number {
  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);

  return Math.max(0, overlapEnd - overlapStart);
}

/**
 * Format time for axis labels
 */
export function formatAxisTime(timestamp: number, totalRange: number): string {
  const date = new Date(timestamp);

  if (totalRange < 86400000) {
    // Less than 1 day
    return formatTime(date);
  } else if (totalRange < 604800000) {
    // Less than 1 week
    return `${date.toLocaleDateString("en-US", { weekday: "short" })} ${formatTime(date)}`;
  } else if (totalRange < 2592000000) {
    // Less than 30 days
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } else if (totalRange < 31536000000) {
    // Less than 1 year
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
  } else {
    return date.getFullYear().toString();
  }
}

/**
 * Get human-readable time unit based on duration
 */
export function getTimeUnit(ms: number): {
  unit:
    | "millisecond"
    | "second"
    | "minute"
    | "hour"
    | "day"
    | "week"
    | "month"
    | "year";
  value: number;
} {
  const seconds = ms / 1000;
  const minutes = seconds / 60;
  const hours = minutes / 60;
  const days = hours / 24;
  const weeks = days / 7;
  const months = days / 30;
  const years = days / 365;

  if (years >= 1) {
    return { unit: "year", value: years };
  } else if (months >= 1) {
    return { unit: "month", value: months };
  } else if (weeks >= 1) {
    return { unit: "week", value: weeks };
  } else if (days >= 1) {
    return { unit: "day", value: days };
  } else if (hours >= 1) {
    return { unit: "hour", value: hours };
  } else if (minutes >= 1) {
    return { unit: "minute", value: minutes };
  } else if (seconds >= 1) {
    return { unit: "second", value: seconds };
  } else {
    return { unit: "millisecond", value: ms };
  }
}
