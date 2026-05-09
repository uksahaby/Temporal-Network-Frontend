// "use client";

// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Slider } from "@/components/ui/slider";
// import { useNetworkStore } from "@/lib/stores/network-store";
// import Link from "next/link";
// import {
//   Play,
//   Pause,
//   SkipBack,
//   SkipForward,
//   Settings,
//   Download,
//   Upload,
// } from "lucide-react";

// export default function Sidebar() {
//   const {
//     timeWindows,
//     currentTimeIndex,
//     isPlaying,
//     playbackSpeed,
//     setCurrentTimeIndex,
//     setIsPlaying,
//     setPlaybackSpeed,
//   } = useNetworkStore();

//   return (
//     <div className="w-full lg:w-64 bg-gray-50 border-r p-4 space-y-6">
//       <div>
//         <h3 className="font-semibold text-gray-900 mb-4">Time Controls</h3>

//         <div className="space-y-4">
//           {/* Time Slider */}
//           <div>
//             <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
//               <span>Time Window</span>
//               <span>
//                 {currentTimeIndex + 1} / {timeWindows.length}
//               </span>
//             </div>
//             <Slider
//               value={[currentTimeIndex]}
//               onValueChange={([value]) => setCurrentTimeIndex(value)}
//               max={Math.max(0, timeWindows.length - 1)}
//               step={1}
//               className="w-full"
//             />
//           </div>

//           {/* Playback Controls */}
//           <div className="grid grid-cols-3 gap-2">
//             <Button
//               size="icon"
//               variant="outline"
//               className="w-full"
//               onClick={() =>
//                 setCurrentTimeIndex(Math.max(0, currentTimeIndex - 1))
//               }
//               disabled={currentTimeIndex === 0}
//             >
//               <SkipBack className="h-4 w-4" />
//             </Button>

//             <Button
//               variant="default"
//               className="w-full"
//               onClick={() => setIsPlaying(!isPlaying)}
//             >
//               {isPlaying ? (
//                 <>
//                   <Pause className="h-4 w-4 mr-2" />
//                   Pause
//                 </>
//               ) : (
//                 <>
//                   <Play className="h-4 w-4 mr-2" />
//                   Play
//                 </>
//               )}
//             </Button>

//             <Button
//               size="icon"
//               variant="outline"
//               className="w-full"
//               onClick={() =>
//                 setCurrentTimeIndex(
//                   Math.min(timeWindows.length - 1, currentTimeIndex + 1),
//                 )
//               }
//               disabled={currentTimeIndex === timeWindows.length - 1}
//             >
//               <SkipForward className="h-4 w-4" />
//             </Button>
//           </div>

//           {/* Speed Controls */}
//           <div>
//             <div className="text-sm text-gray-600 mb-2">Playback Speed</div>
//             <div className="grid grid-cols-3 gap-2">
//               {[1, 2, 5].map((speed) => (
//                 <Button
//                   key={speed}
//                   variant={playbackSpeed === speed ? "default" : "outline"}
//                   size="sm"
//                   onClick={() => setPlaybackSpeed(speed)}
//                   className="w-full"
//                 >
//                   {speed}x
//                 </Button>
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className="space-y-2">
//         <Link href="/upload" className="block">
//           <Button variant="outline" className="w-full justify-start">
//             <Upload className="h-4 w-4 mr-2" />
//             Analyze Another File
//           </Button>
//         </Link>
//         <Button variant="outline" className="w-full justify-start">
//           <Settings className="h-4 w-4 mr-2" />
//           Settings
//         </Button>
//         <Button variant="outline" className="w-full justify-start">
//           <Download className="h-4 w-4 mr-2" />
//           Export Data
//         </Button>
//       </div>
//     </div>
//   );
// }
