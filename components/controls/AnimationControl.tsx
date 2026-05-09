"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Settings,
  Zap,
  RefreshCw,
  Camera,
  Download,
  Eye,
  EyeOff,
} from "lucide-react";
import { useNetworkStore } from "@/lib/stores/network-store";

interface AnimationSettings {
  isPlaying: boolean;
  speed: number;
  direction: "forward" | "backward";
  loop: boolean;
  smoothTransitions: boolean;
  showTrails: boolean;
  highlightChanges: boolean;
  autoScale: boolean;
  frameRate: number;
}

export function AnimationControls() {
  const [settings, setSettings] = useState<AnimationSettings>({
    isPlaying: false,
    speed: 1,
    direction: "forward",
    loop: true,
    smoothTransitions: true,
    showTrails: false,
    highlightChanges: true,
    autoScale: true,
    frameRate: 60,
  });

  const { currentTime, timeRange, setAnimationState } = useNetworkStore();

  const handlePlayPause = useCallback(() => {
    const newState = !settings.isPlaying;
    setSettings((prev) => ({ ...prev, isPlaying: newState }));
    setAnimationState({ isPlaying: newState });
  }, [settings.isPlaying, setAnimationState]);

  const handleSpeedChange = useCallback(
    (value: number[]) => {
      const newSpeed = value[0];
      setSettings((prev) => ({ ...prev, speed: newSpeed }));
      setAnimationState({ speed: newSpeed });
    },
    [setAnimationState],
  );

  const handleDirectionToggle = useCallback(() => {
    const newDirection =
      settings.direction === "forward" ? "backward" : "forward";
    setSettings((prev) => ({ ...prev, direction: newDirection }));
    setAnimationState({ direction: newDirection });
  }, [settings.direction, setAnimationState]);

  const handleExportAnimation = useCallback(async () => {
    try {
      // Simulate export functionality
      console.log("Exporting animation...");
      // In real implementation, this would call backend API
      alert("Animation export started. You will be notified when it is ready.");
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    }
  }, []);

  const handleCaptureSnapshot = useCallback(() => {
    // Capture current visualization state
    console.log("Capturing snapshot...");
    // In real implementation, this would capture the canvas
    alert("Snapshot captured!");
  }, []);

  if (!timeRange) return null;

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Main Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-medium">
                <Zap className="h-5 w-5" />
                <span>Animation Controls</span>
              </div>
              <Badge variant={settings.isPlaying ? "default" : "secondary"}>
                {settings.isPlaying ? "Playing" : "Paused"}
              </Badge>
            </div>

            <div className="flex items-center justify-center space-x-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  // Jump to start
                  setAnimationState({ targetTime: timeRange.start });
                }}
                disabled={settings.isPlaying}
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button
                variant="default"
                size="lg"
                className="h-12 w-12 rounded-full"
                onClick={handlePlayPause}
              >
                {settings.isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  // Jump to end
                  setAnimationState({ targetTime: timeRange.end });
                }}
                disabled={settings.isPlaying}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Speed Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Speed: {settings.speed}x
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDirectionToggle}
                >
                  {settings.direction === "forward" ? "Forward" : "Backward"}
                </Button>
              </div>
              <Slider
                value={[settings.speed]}
                onValueChange={handleSpeedChange}
                min={0.1}
                max={10}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>0.1x</span>
                <span>Normal</span>
                <span>Fast</span>
                <span>10x</span>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 font-medium">
              <Settings className="h-5 w-5" />
              <span>Animation Settings</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm">Loop Animation</label>
                  <Switch
                    checked={settings.loop}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, loop: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm">Smooth Transitions</label>
                  <Switch
                    checked={settings.smoothTransitions}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        smoothTransitions: checked,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm">Show Motion Trails</label>
                  <Switch
                    checked={settings.showTrails}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, showTrails: checked }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm">Highlight Changes</label>
                  <Switch
                    checked={settings.highlightChanges}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        highlightChanges: checked,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm">Auto-scale View</label>
                  <Switch
                    checked={settings.autoScale}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, autoScale: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm">Frame Rate</label>
                  <select
                    value={settings.frameRate}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        frameRate: parseInt(e.target.value),
                      }))
                    }
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value={30}>30 FPS</option>
                    <option value={60}>60 FPS</option>
                    <option value={120}>120 FPS</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Export & Actions */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center space-x-2 font-medium">
              <Download className="h-5 w-5" />
              <span>Export & Actions</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleCaptureSnapshot}
                className="flex items-center justify-center space-x-2"
              >
                <Camera className="h-4 w-4" />
                <span>Snapshot</span>
              </Button>

              <Button
                variant="outline"
                onClick={handleExportAnimation}
                className="flex items-center justify-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Export Video</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  // Reset animation
                  setSettings((prev) => ({ ...prev, isPlaying: false }));
                  setAnimationState({
                    isPlaying: false,
                    targetTime: timeRange.start,
                  });
                }}
                className="flex items-center justify-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reset</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  // Toggle preview mode
                  console.log("Toggle preview mode");
                }}
                className="flex items-center justify-center space-x-2"
              >
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </Button>
            </div>
          </div>

          {/* Status */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <div
                  className={`h-2 w-2 rounded-full ${settings.isPlaying ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}
                />
                <span>{settings.isPlaying ? "Animating" : "Ready"}</span>
              </div>
              <div className="text-gray-600">
                Frame:{" "}
                {Math.round(
                  ((currentTime - timeRange.start) /
                    (timeRange.end - timeRange.start)) *
                    100,
                )}
                %
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
