"use client";

import { Button } from "@/components/ui/button";
import { useNetworkStore } from "@/lib/stores/network-store";
import { UserMenu } from "@/components/user-menu";
import {
  Network,
  BarChart3,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Sparkles,
  Download,
} from "lucide-react";

export default function Header() {
  const { status, timeWindows, currentTimeIndex } = useNetworkStore();

  const currentWindow = timeWindows[currentTimeIndex];

  return (
    <div className="sticky top-0 z-50 glass border-b border-white/10 dark:border-white/5">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 blur-xl rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="relative p-2.5 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg shadow-primary/25">
                  <Network className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gradient">
                  Temporal Network Explorer
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Interactive Analysis Platform
                </p>
              </div>
            </div>

            {/* Live Metrics Pills */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-subtle hover-lift cursor-default">
                <div className="relative flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full pulse-ring" />
                </div>
                <span className="text-xs font-medium text-foreground/80">
                  {currentWindow?.start
                    ? new Date(currentWindow.start).toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })
                    : "No data"}
                </span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-subtle hover-lift cursor-default">
                <BarChart3 className="h-3.5 w-3.5 text-accent-foreground" />
                <span className="text-xs font-medium text-foreground/80">
                  Window{" "}
                  <span className="font-bold text-primary">
                    {currentTimeIndex + 1}
                  </span>{" "}
                  / {timeWindows.length}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Indicators */}
            {status === "processing" && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl animate-pulse">
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Analyzing...
                </span>
              </div>
            )}

            {status === "completed" && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="relative">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <Sparkles className="absolute -top-1 -right-1 h-2.5 w-2.5 text-yellow-500" />
                </div>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  Ready
                </span>
              </div>
            )}

            {status === "failed" && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  Error
                </span>
              </div>
            )}

            {/* Actions */}
            <Button
              variant="outline"
              size="sm"
              className="btn-interactive gap-2 glass-subtle border-white/20 hover:border-primary/50 hover:bg-primary/5"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>

            <UserMenu />
          </div>
        </div>
      </div>
    </div>
  );
}
