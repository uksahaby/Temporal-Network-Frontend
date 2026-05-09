"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Calendar,
  Clock,
  Zap,
  ChevronLeft,
  ChevronRight,
  FastForward,
  Rewind,
} from "lucide-react";
import { useNetworkStore } from "@/lib/stores/network-store";
import { formatDate, formatTime } from "@/lib/utils/date";

const stepOptions = ["hour", "day", "week", "month"] as const;
const stepMsByKey = {
  hour: 3600000,
  day: 86400000,
  week: 604800000,
  month: 2592000000,
} as const;

interface TimeControlsProps {
  isPlaying?: boolean;
  onPlayPause?: (playing: boolean) => void;
  onTimeChange?: (time: number) => void;
  onSpeedChange?: (speed: number) => void;
}

export function TimeControls({
  isPlaying,
  onPlayPause,
  onTimeChange,
  onSpeedChange,
}: TimeControlsProps) {
  const {
    timeRange,
    currentTime,
    playbackSpeed,
    isPlaying: storeIsPlaying,
    setTime,
    setPlaybackSpeed,
    setIsPlaying,
  } = useNetworkStore();

  const [localSpeed, setLocalSpeed] = useState(playbackSpeed);
  const resolvedIsPlaying = isPlaying ?? storeIsPlaying;

  useEffect(() => {
    setLocalSpeed(playbackSpeed);
  }, [playbackSpeed]);

  const handleTimeChange = useCallback(
    (value: number[]) => {
      if (!timeRange) return;

      const percent = value[0] ?? 0;
      const newTime =
        timeRange.start + (percent / 100) * (timeRange.end - timeRange.start);

      if (onTimeChange) {
        onTimeChange(newTime);
      } else {
        setTime(newTime);
      }
    },
    [onTimeChange, setTime, timeRange],
  );

  const handleSpeedChange = useCallback(
    (value: number[]) => {
      const newSpeed = value[0] ?? 1;
      setLocalSpeed(newSpeed);

      if (onSpeedChange) {
        onSpeedChange(newSpeed);
      } else {
        setPlaybackSpeed(newSpeed);
      }
    },
    [onSpeedChange, setPlaybackSpeed],
  );

  const getTimePosition = () => {
    if (!timeRange) return 0;
    const denom = timeRange.end - timeRange.start;
    if (denom <= 0) return 0;
    return ((currentTime - timeRange.start) / denom) * 100;
  };

  const getTimeProgress = () => {
    if (!timeRange) return 0;
    const total = timeRange.end - timeRange.start;
    const elapsed = currentTime - timeRange.start;
    return (elapsed / total) * 100;
  };

  const formatTimeRange = (timestamp: number) => {
    const date = new Date(timestamp);
    return {
      date: formatDate(date, "short"),
      time: formatTime(date),
      full: `${formatDate(date, "short")} ${formatTime(date)}`,
    };
  };

  if (!timeRange) return null;

  const timePercent = getTimePosition();
  const progress = getTimeProgress();
  const currentFormatted = formatTimeRange(currentTime);
  const startFormatted = formatTimeRange(timeRange.start);
  const endFormatted = formatTimeRange(timeRange.end);

  return (
    <Card className="w-full overflow-hidden border-gray-200 dark:border-gray-800 shadow-sm">
      {/* Progress Bar - Ultra Slim */}
      <div className="h-0.5 w-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
          style={{ width: `${progress}%` }}
        />
      </div>

      <CardContent className="p-3.5">
        <div className="space-y-3.5">
          {/* Row 1: Time Range Header + Percentage - Compact */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <div className="p-1 bg-blue-50 dark:bg-blue-950/30 rounded">
                <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Range
              </span>
            </div>
            <div className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
              <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                {Math.round(progress)}%
              </span>
            </div>
          </div>

          {/* Row 2: Start/End - Mini Cards Inline */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 rounded px-2 py-1.5">
              <div className="text-[9px] text-gray-500 dark:text-gray-400">
                START
              </div>
              <div className="font-mono text-[11px] font-medium text-gray-900 dark:text-gray-100">
                {startFormatted.date}
              </div>
              <div className="font-mono text-[9px] text-gray-600 dark:text-gray-400">
                {startFormatted.time}
              </div>
            </div>

            <div className="flex flex-col items-center px-0.5">
              <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                <Clock className="h-2.5 w-2.5 text-white" />
              </div>
            </div>

            <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 rounded px-2 py-1.5 text-right">
              <div className="text-[9px] text-gray-500 dark:text-gray-400">
                END
              </div>
              <div className="font-mono text-[11px] font-medium text-gray-900 dark:text-gray-100">
                {endFormatted.date}
              </div>
              <div className="font-mono text-[9px] text-gray-600 dark:text-gray-400">
                {endFormatted.time}
              </div>
            </div>
          </div>

          {/* Row 3: Current Time - Compact Badge */}
          <div className="flex items-center justify-between bg-blue-50/50 dark:bg-blue-950/20 rounded px-2.5 py-1.5">
            <div className="flex items-center space-x-1.5">
              <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              <span className="text-[10px] text-gray-600 dark:text-gray-400">
                Now
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono font-medium text-blue-700 dark:text-blue-300">
                {currentFormatted.time}
              </span>
              <span className="text-[9px] text-gray-500 dark:text-gray-500">
                {currentFormatted.date}
              </span>
            </div>
          </div>

          {/* Row 4: Timeline Slider - Compact */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                Timeline
              </span>
              <span className="text-[9px] font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                {currentFormatted.full}
              </span>
            </div>
            <Slider
              value={[timePercent]}
              onValueChange={handleTimeChange}
              max={100}
              step={0.1}
              className="w-full [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:bg-blue-600"
            />
            <div className="flex justify-between text-[8px] text-gray-500 dark:text-gray-400">
              <span>{startFormatted.time}</span>
              <span>{endFormatted.time}</span>
            </div>
          </div>

          {/* Row 5: Playback Controls + Speed - Single Line */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full"
                onClick={() =>
                  onTimeChange
                    ? onTimeChange(timeRange.start)
                    : setTime(timeRange.start)
                }
                disabled={resolvedIsPlaying}
              >
                <Rewind className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full"
                onClick={() => {
                  const stepBack = Math.max(
                    currentTime - stepMsByKey.hour,
                    timeRange.start,
                  );
                  onTimeChange ? onTimeChange(stepBack) : setTime(stepBack);
                }}
                disabled={resolvedIsPlaying}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="default"
                size="icon"
                className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600"
                onClick={() => {
                  const nextState = !resolvedIsPlaying;
                  if (onPlayPause) onPlayPause(nextState);
                  else setIsPlaying(nextState);
                }}
              >
                {resolvedIsPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full"
                onClick={() => {
                  const stepForward = Math.min(
                    currentTime + stepMsByKey.hour,
                    timeRange.end,
                  );
                  onTimeChange
                    ? onTimeChange(stepForward)
                    : setTime(stepForward);
                }}
                disabled={resolvedIsPlaying}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full"
                onClick={() =>
                  onTimeChange
                    ? onTimeChange(timeRange.end)
                    : setTime(timeRange.end)
                }
                disabled={resolvedIsPlaying}
              >
                <FastForward className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Speed Control - Compact */}
            <div className="flex items-center space-x-1.5">
              <Zap className="h-3 w-3 text-amber-500" />
              <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                {[0.5, 1, 2, 5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange([speed])}
                    className={`px-1.5 py-0.5 text-[10px] font-medium transition-colors
                      ${
                        localSpeed === speed
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                          : "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 6: Quick Navigation - Tight Grid */}
          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
            {stepOptions.map((step) => (
              <Button
                key={step}
                variant="outline"
                size="sm"
                className="h-7 text-[9px] px-0 border-gray-200 dark:border-gray-700"
                onClick={() => {
                  const stepMs = stepMsByKey[step];
                  const nextTime = Math.min(
                    currentTime + stepMs,
                    timeRange.end,
                  );
                  if (onTimeChange) onTimeChange(nextTime);
                  else setTime(nextTime);
                }}
                disabled={resolvedIsPlaying}
              >
                +1 {step}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
