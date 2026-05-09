/**
 * Data formatting utilities for network visualization
 */

/**
 * Format large numbers with appropriate units
 */
export function formatNumber(
  num: number,
  options: {
    decimals?: number;
    compact?: boolean;
    prefix?: string;
    suffix?: string;
  } = {},
): string {
  const { decimals = 2, compact = true, prefix = "", suffix = "" } = options;

  if (isNaN(num) || !isFinite(num)) {
    return "N/A";
  }

  if (compact) {
    const absNum = Math.abs(num);

    if (absNum >= 1e12) {
      return `${prefix}${(num / 1e12).toFixed(decimals)}T${suffix}`;
    } else if (absNum >= 1e9) {
      return `${prefix}${(num / 1e9).toFixed(decimals)}B${suffix}`;
    } else if (absNum >= 1e6) {
      return `${prefix}${(num / 1e6).toFixed(decimals)}M${suffix}`;
    } else if (absNum >= 1e3) {
      return `${prefix}${(num / 1e3).toFixed(decimals)}K${suffix}`;
    }
  }

  // Format with locale-aware number formatting
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${prefix}${formatter.format(num)}${suffix}`;
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
  if (isNaN(value)) return "N/A";

  const formatter = new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return formatter.format(value);
}

/**
 * Format duration in milliseconds to human-readable format
 */
export function formatDuration(
  ms: number,
  options: {
    verbose?: boolean;
    showMilliseconds?: boolean;
  } = {},
): string {
  const { verbose = false, showMilliseconds = false } = options;

  if (isNaN(ms) || ms < 0) return "N/A";

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;
  const remainingMs = ms % 1000;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}${verbose ? " day" + (days !== 1 ? "s" : "") : "d"}`);
  }

  if (remainingHours > 0 || (verbose && days > 0)) {
    parts.push(
      `${remainingHours}${verbose ? " hour" + (remainingHours !== 1 ? "s" : "") : "h"}`,
    );
  }

  if (remainingMinutes > 0 || (verbose && (days > 0 || hours > 0))) {
    parts.push(
      `${remainingMinutes}${verbose ? " minute" + (remainingMinutes !== 1 ? "s" : "") : "m"}`,
    );
  }

  if (remainingSeconds > 0 || showMilliseconds) {
    if (showMilliseconds && remainingMs > 0) {
      parts.push(
        `${remainingSeconds}.${remainingMs.toString().padStart(3, "0")}${verbose ? " seconds" : "s"}`,
      );
    } else {
      parts.push(
        `${remainingSeconds}${verbose ? " second" + (remainingSeconds !== 1 ? "s" : "") : "s"}`,
      );
    }
  } else if (parts.length === 0) {
    // Show at least something
    parts.push(`0${verbose ? " seconds" : "s"}`);
  }

  return parts.join(" ");
}

/**
 * Format a range of values
 */
export function formatRange(
  min: number,
  max: number,
  options: {
    decimals?: number;
    separator?: string;
    unit?: string;
  } = {},
): string {
  const { decimals = 2, separator = " - ", unit = "" } = options;

  if (isNaN(min) || isNaN(max)) return "N/A";

  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${formatter.format(min)}${unit}${separator}${formatter.format(max)}${unit}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(
  text: string,
  maxLength: number,
  ellipsis: string = "...",
): string {
  if (text.length <= maxLength) return text;

  return text.substring(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Format ID for display (truncate or add prefix)
 */
export function formatId(
  id: string,
  options: {
    maxLength?: number;
    prefix?: string;
    showFullOnHover?: boolean;
  } = {},
): { display: string; full: string } {
  const { maxLength = 20, prefix = "", showFullOnHover = true } = options;

  let display = id;

  // Add prefix if specified
  if (prefix && !id.startsWith(prefix)) {
    display = `${prefix}:${id}`;
  }

  // Truncate if too long
  if (display.length > maxLength) {
    const truncated = truncateText(display, maxLength);
    return {
      display: truncated,
      full: showFullOnHover ? display : truncated,
    };
  }

  return {
    display,
    full: display,
  };
}

/**
 * Format list of items
 */
export function formatList(
  items: string[],
  options: {
    maxItems?: number;
    separator?: string;
    lastSeparator?: string;
  } = {},
): string {
  const { maxItems = 5, separator = ", ", lastSeparator = " and " } = options;

  if (items.length === 0) return "";
  if (items.length === 1) return items[0];

  const visibleItems = items.slice(0, maxItems);
  const remainingCount = items.length - visibleItems.length;

  let result = visibleItems.join(separator);

  if (remainingCount > 0) {
    result += `${separator}${remainingCount} more`;
  } else if (visibleItems.length > 1) {
    // Replace last separator
    const lastCommaIndex = result.lastIndexOf(separator);
    if (lastCommaIndex !== -1) {
      result =
        result.substring(0, lastCommaIndex) +
        lastSeparator +
        result.substring(lastCommaIndex + separator.length);
    }
  }

  return result;
}

/**
 * Format data quality indicator
 */
export function formatQuality(
  score: number,
  options: {
    showIcon?: boolean;
    showText?: boolean;
  } = {},
): { text: string; color: string; icon: string } {
  const { showIcon = true, showText = true } = options;

  if (score >= 0.9) {
    return {
      text: showText ? "Excellent" : "",
      color: "text-green-600 bg-green-100",
      icon: showIcon ? "✓" : "",
    };
  } else if (score >= 0.7) {
    return {
      text: showText ? "Good" : "",
      color: "text-blue-600 bg-blue-100",
      icon: showIcon ? "✓" : "",
    };
  } else if (score >= 0.5) {
    return {
      text: showText ? "Fair" : "",
      color: "text-yellow-600 bg-yellow-100",
      icon: showIcon ? "⚠" : "",
    };
  } else {
    return {
      text: showText ? "Poor" : "",
      color: "text-red-600 bg-red-100",
      icon: showIcon ? "✗" : "",
    };
  }
}

/**
 * Format centrality value for tooltip
 */
export function formatCentrality(
  value: number,
  type: "degree" | "betweenness" | "closeness" | "eigenvector",
): { label: string; value: string; description: string } {
  const formattedValue = value.toFixed(4);
  let description = "";

  switch (type) {
    case "degree":
      description = "Number of connections relative to maximum possible";
      break;
    case "betweenness":
      description = "Frequency of appearing on shortest paths";
      break;
    case "closeness":
      description = "Average distance to all other nodes";
      break;
    case "eigenvector":
      description = "Influence based on connections to influential nodes";
      break;
  }

  return {
    label: `${type.charAt(0).toUpperCase() + type.slice(1)} Centrality`,
    value: formattedValue,
    description,
  };
}

/**
 * Format weight for display
 */
export function formatWeight(
  weight: number,
  options: {
    normalized?: boolean;
    maxWeight?: number;
  } = {},
): string {
  const { normalized = false, maxWeight = 1 } = options;

  if (normalized && maxWeight > 0) {
    const normalizedWeight = weight / maxWeight;
    return `${(normalizedWeight * 100).toFixed(1)}%`;
  }

  if (weight % 1 === 0) {
    return weight.toString();
  } else {
    return weight.toFixed(2);
  }
}

/**
 * Format timestamp for tooltip
 */
export function formatTimestamp(
  timestamp: number,
  relativeTo?: number,
): { absolute: string; relative: string } {
  const date = new Date(timestamp);

  const absolute = date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  let relative = "";
  if (relativeTo) {
    const diff = relativeTo - timestamp;
    const absDiff = Math.abs(diff);

    if (absDiff < 60000) {
      // Less than 1 minute
      relative = `${Math.round(absDiff / 1000)}s ${diff > 0 ? "ago" : "from now"}`;
    } else if (absDiff < 3600000) {
      // Less than 1 hour
      relative = `${Math.round(absDiff / 60000)}m ${diff > 0 ? "ago" : "from now"}`;
    } else if (absDiff < 86400000) {
      // Less than 1 day
      relative = `${Math.round(absDiff / 3600000)}h ${diff > 0 ? "ago" : "from now"}`;
    } else {
      relative = `${Math.round(absDiff / 86400000)}d ${diff > 0 ? "ago" : "from now"}`;
    }
  }

  return { absolute, relative };
}

/**
 * Color formatters for different value ranges
 */
export function getColorForValue(
  value: number,
  min: number,
  max: number,
  scheme: "sequential" | "diverging" | "categorical" = "sequential",
): string {
  if (min === max) return "#666666";

  const normalized = (value - min) / (max - min);

  switch (scheme) {
    case "sequential":
      // Blue sequential
      const hue = 240 - normalized * 180; // Blue to cyan
      return `hsl(${hue}, 70%, 50%)`;

    case "diverging":
      // Red-white-blue diverging
      if (normalized < 0.5) {
        const redIntensity = 255;
        const blueIntensity = Math.round(255 * (normalized * 2));
        return `rgb(${redIntensity}, ${blueIntensity}, ${blueIntensity})`;
      } else {
        const redIntensity = Math.round(255 * ((1 - normalized) * 2));
        const blueIntensity = 255;
        return `rgb(${redIntensity}, ${redIntensity}, ${blueIntensity})`;
      }

    case "categorical":
      // Predefined categorical colors
      const colors = [
        "#FF6B6B",
        "#4ECDC4",
        "#FFD166",
        "#06D6A0",
        "#118AB2",
        "#073B4C",
        "#EF476F",
        "#7209B7",
        "#3A86FF",
        "#FB5607",
        "#8338EC",
        "#FF006E",
      ];
      const index = Math.floor(normalized * colors.length) % colors.length;
      return colors[index];

    default:
      return "#666666";
  }
}
