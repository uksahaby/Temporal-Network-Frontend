import Link from "next/link";
import { ArrowRight, ChevronRight, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { TextEffect } from "@/components/ui/text-effect";
import { AnimatedGroup } from "@/components/ui/animated-group";
import { HeroHeader } from "./header";
import { Card, CardContent } from "@/components/ui/card";
import { Network, Clock, BarChart3 } from "lucide-react";

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: "blur(12px)",
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        type: "spring" as const,
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

export default function HeroSection() {
  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 isolate hidden opacity-65 contain-strict lg:block"
        >
          <div className="w-140 h-320 -translate-y-87.5 absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
          <div className="h-320 absolute left-0 top-0 w-60 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="h-320 -translate-y-87.5 absolute left-0 top-0 w-60 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
        </div>
        <section>
          {/* Reduced top padding from pt-24 md:pt-36 to pt-16 md:pt-20 */}
          <div className="relative pt-16 md:pt-35">
            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      delayChildren: 1,
                    },
                  },
                },
                item: {
                  hidden: {
                    opacity: 0,
                    y: 20,
                  },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      type: "spring",
                      bounce: 0.3,
                      duration: 2,
                    },
                  },
                },
              }}
              className="mask-b-from-35% mask-b-to-90% absolute inset-0 top-40 -z-20 lg:top-24"
            >
              <Image
                src="https://ik.imagekit.io/lrigu76hy/tailark/night-background.jpg?updatedAt=1745733451120"
                alt="background"
                className="hidden size-full dark:block"
                width="3276"
                height="4095"
              />
            </AnimatedGroup>

            <div
              aria-hidden
              className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--color-background)_75%)]"
            />

            <div className="mx-auto max-w-7xl px-6">
              {/* Split Layout: Text Left, Image Right */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                {/* Left Column - Text Content */}
                <div className="text-center lg:text-left">
                  <TextEffect
                    per="line"
                    preset="fade-in-blur"
                    speedSegment={0.3}
                    as="h1"
                    // Reduced top margin from mt-8 to mt-4, and lg:mt-14 to lg:mt-8
                    className="mx-auto lg:mx-0 max-w-4xl text-balance text-4xl font-semibold tracking-tight leading-[0.90] md:text-6xl lg:mt-8 xl:text-15xl"
                  >
                    {
                      "MSc Group 12 Project COMP530\nTemporal Network Visualization & Exploration Tool"
                    }
                  </TextEffect>
                  <TextEffect
                    per="line"
                    preset="fade-in-blur"
                    speedSegment={0.5}
                    delay={0.3}
                    as="p"
                    // Reduced top margin from mt-6 to mt-4
                    className="mx-auto lg:mx-0 mt-4 max-w-2xl text-balance text-base text-muted-foreground md:text-lg leading-relaxed"
                  >
                    Analyze and visualize temporal network evolution with
                    interactive tools. Upload your data and watch networks
                    change over time.
                  </TextEffect>

                  <AnimatedGroup
                    variants={{
                      container: {
                        visible: {
                          transition: {
                            staggerChildren: 0.05,
                            delayChildren: 0.75,
                          },
                        },
                      },
                      ...transitionVariants,
                    }}
                    // Reduced top margin from mt-8 to mt-6
                    className="mt-8 flex flex-col items-center lg:items-start justify-center gap-3 md:flex-row lg:justify-start"
                  >
                    <div key={1} className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-2xl blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-500" />
                      <Button
                        asChild
                        size="lg"
                        className="relative rounded-xl px-8 text-base h-12 btn-interactive shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/40"
                      >
                        <Link href="/upload">
                          <Upload className="mr-2 h-5 w-5" />
                          <span className="text-nowrap">Get Started</span>
                        </Link>
                      </Button>
                    </div>
                    <Button
                      key={2}
                      asChild
                      size="lg"
                      variant="outline"
                      className="h-12 rounded-xl px-8 text-base glass border-white/20 hover:border-primary/50 hover:bg-primary/5 group"
                    >
                      <Link href="/dashboard?demo=true">
                        <span className="text-nowrap">View Demo</span>
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </AnimatedGroup>
                  <div className="mb-12 mt-3"></div>

                  {/* Stats Row - Reduced top margin from mt-8 to mt-5 */}
                  {/* <div className="mt-5 flex flex-wrap items-center gap-4 justify-center lg:justify-start">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      <span>2GB uploads</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <span>1M+ nodes</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                      <span>4+ metrics</span>
                    </div>
                  </div> */}
                </div>

                {/* Right Column - Image/Visualization Preview */}
                <div className="relative hidden lg:block">
                  <AnimatedGroup
                    variants={{
                      container: {
                        visible: {
                          transition: {
                            delayChildren: 1.2,
                          },
                        },
                      },
                      item: transitionVariants.item,
                    }}
                    className="relative"
                  >
                    {/* Main Visualization Card */}
                    <div className="relative rounded-2xl border border-white/10 glass-subtle shadow-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />

                      {/* Network Visualization Preview */}
                      <div className="relative p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-red-500 pulse-ring" />
                            <div
                              className="h-3 w-3 rounded-full bg-primary pulse-ring"
                              style={{ animationDelay: "0.5s" }}
                            />
                            <div
                              className="h-3 w-3 rounded-full bg-green-500 pulse-ring"
                              style={{ animationDelay: "1s" }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            Live Preview
                          </span>
                        </div>

                        {/* Network Graph Mockup */}
                        <div className="relative h-64 w-full">
                          {/* Connection lines */}
                          <svg className="absolute inset-0 h-full w-full">
                            <defs>
                              <linearGradient
                                id="line1"
                                x1="0%"
                                y1="0%"
                                x2="100%"
                                y2="0%"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="oklch(0.6 0.2 270)"
                                />
                                <stop
                                  offset="100%"
                                  stopColor="oklch(0.7 0.15 200)"
                                />
                              </linearGradient>
                              <linearGradient
                                id="line2"
                                x1="0%"
                                y1="0%"
                                x2="100%"
                                y2="0%"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="oklch(0.7 0.18 150)"
                                />
                                <stop
                                  offset="100%"
                                  stopColor="oklch(0.75 0.15 180)"
                                />
                              </linearGradient>
                            </defs>
                            <line
                              x1="30%"
                              y1="40%"
                              x2="50%"
                              y2="60%"
                              stroke="url(#line1)"
                              strokeWidth="2"
                              strokeOpacity="0.7"
                              className="animate-pulse"
                            />
                            <line
                              x1="50%"
                              y1="60%"
                              x2="70%"
                              y2="30%"
                              stroke="url(#line2)"
                              strokeWidth="2"
                              strokeOpacity="0.7"
                              className="animate-pulse"
                              style={{ animationDelay: "0.2s" }}
                            />
                            <line
                              x1="70%"
                              y1="30%"
                              x2="40%"
                              y2="70%"
                              stroke="oklch(0.7 0.16 22)"
                              strokeWidth="2"
                              strokeOpacity="0.6"
                              className="animate-pulse"
                              style={{ animationDelay: "0.4s" }}
                            />
                            <line
                              x1="40%"
                              y1="70%"
                              x2="20%"
                              y2="50%"
                              stroke="oklch(0.65 0.2 290)"
                              strokeWidth="2"
                              strokeOpacity="0.6"
                              className="animate-pulse"
                              style={{ animationDelay: "0.6s" }}
                            />
                            <line
                              x1="20%"
                              y1="50%"
                              x2="30%"
                              y2="40%"
                              stroke="oklch(0.8 0.15 80)"
                              strokeWidth="2"
                              strokeOpacity="0.6"
                              className="animate-pulse"
                              style={{ animationDelay: "0.8s" }}
                            />
                          </svg>

                          {/* Nodes with glow */}
                          <div className="absolute left-[30%] top-[40%] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-4 ring-primary/30 shadow-lg shadow-primary/40 float" />
                          <div
                            className="absolute left-[50%] top-[60%] h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-500 ring-4 ring-green-500/30 shadow-lg shadow-green-500/40 float"
                            style={{ animationDelay: "0.5s" }}
                          />
                          <div
                            className="absolute left-[70%] top-[30%] h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-red-500 to-orange-500 ring-4 ring-red-500/30 shadow-lg shadow-red-500/40 float"
                            style={{ animationDelay: "1s" }}
                          />
                          <div
                            className="absolute left-[40%] top-[70%] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 ring-4 ring-purple-500/30 shadow-lg shadow-purple-500/40 float"
                            style={{ animationDelay: "1.5s" }}
                          />
                          <div
                            className="absolute left-[20%] top-[50%] h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-yellow-500 to-amber-500 ring-4 ring-yellow-500/30 shadow-lg shadow-yellow-500/40 float"
                            style={{ animationDelay: "2s" }}
                          />

                          {/* Animated pulse rings */}
                          <div className="absolute left-[50%] top-[60%] h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-green-500/50 animate-ping" />
                          <div
                            className="absolute left-[30%] top-[40%] h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/50 animate-ping"
                            style={{ animationDelay: "0.5s" }}
                          />
                        </div>

                        {/* Time Slider Mockup */}
                        <div className="mt-6 space-y-3">
                          <div className="flex justify-between text-xs text-muted-foreground font-mono">
                            <span>t₀</span>
                            <span>t₁</span>
                            <span>t₂</span>
                            <span>t₃</span>
                          </div>
                          <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                            <div className="h-full w-2/3 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] rounded-full animate-gradient" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Floating Metric Cards with glassmorphism */}
                    <div className="absolute -bottom-8 -left-4 glass rounded-xl border border-white/20 p-4 shadow-2xl hover-lift">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <BarChart3 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Density
                          </p>
                          <p className="text-lg font-bold text-gradient">
                            0.042
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="absolute -top-4 -right-4 glass rounded-xl border border-white/20 p-4 shadow-2xl hover-lift">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent/10 rounded-lg">
                          <Clock className="h-4 w-4 text-accent-foreground" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Time Windows
                          </p>
                          <p className="text-lg font-bold text-gradient">24</p>
                        </div>
                      </div>
                    </div>
                  </AnimatedGroup>
                  <div className="mb-12 mt-3"></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
