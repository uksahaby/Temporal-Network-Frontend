import Header from "@/components/dashboard/Header";
import HeroSection from "@/components/hero-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// Fallback Separator (the "@/components/ui/separator" file is missing in this project)
const Separator = ({ className = "", ...props }: any) => (
  <hr
    className={`w-full border-t border-gray-200 dark:border-gray-800 ${className}`}
    {...props}
  />
);
import {
  Upload,
  Network,
  BarChart3,
  Cpu,
  ArrowRight,
  Clock,
  Users,
  Sparkles,
  Github,
  Activity,
  PlayCircle,
  Database,
  GitBranch,
  Calendar,
  TrendingUp,
  Award,
  Code2,
  Workflow,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const features = [
    {
      icon: Upload,
      iconBg: "bg-blue-100 dark:bg-blue-950/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      title: "Upload Large Datasets",
      description:
        "Upload files in any format, even at massive scale. We parse and normalize for temporal analysis.",
    },
    {
      icon: Network,
      iconBg: "bg-green-100 dark:bg-green-950/30",
      iconColor: "text-green-600 dark:text-green-400",
      title: "Temporal Visualization",
      description:
        "Watch networks evolve with animated node/edge appearances and disappearances.",
    },
    {
      icon: BarChart3,
      iconBg: "bg-purple-100 dark:bg-purple-950/30",
      iconColor: "text-purple-600 dark:text-purple-400",
      title: "Advanced Metrics",
      description:
        "Compute time-dependent centrality measures: degree, betweenness, closeness, PageRank.",
    },
    {
      icon: Clock,
      iconBg: "bg-orange-100 dark:bg-orange-950/30",
      iconColor: "text-orange-600 dark:text-orange-400",
      title: "Time-Based Analysis",
      description:
        "Analyze network evolution with configurable time windows and step sizes.",
    },
  ];

  const techStack = [
    {
      name: "Next.js 14",
      description: "Frontend Framework",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/20",
      icon: Code2,
    },
    {
      name: "D3.js",
      description: "Visualization",
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-950/20",
      icon: Workflow,
    },
    {
      name: "Python",
      description: "Backend Analysis",
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-950/20",
      icon: Cpu,
    },
    {
      name: "NetworkX",
      description: "Network Analysis",
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/20",
      icon: GitBranch,
    },
  ];

  const requiredFields = [
    { name: "source", desc: "Source node ID", color: "blue" },
    { name: "target", desc: "Target node ID", color: "blue" },
    { name: "timestamp", desc: "Interaction timestamp", color: "blue" },
  ];

  const optionalFields = [
    { name: "weight", desc: "Edge weight (default: 1)", color: "green" },
    { name: "type", desc: "Interaction type", color: "green" },
  ];

  return (
    <main className="min-h-screen gradient-mesh">
      {/* Hero Section - Enhanced */}
      <div className="relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -right-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-10xl mx-auto px-1 sm:px-1 py-8 md:py-1">
          <HeroSection />
          <Separator className="my-3" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12 md:pb-16">
        {/* Feature Grid - Enhanced */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8 fade-in-up">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gradient">
                Powerful Features
              </h2>
              <p className="text-muted-foreground mt-2">
                Everything you need to analyze temporal networks
              </p>
            </div>
            <Badge
              variant="outline"
              className="hidden md:flex px-4 py-2 text-sm glass border-white/20"
            >
              <Sparkles className="h-4 w-4 mr-2 text-yellow-500" />
              Enterprise Ready
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="group glass hover-lift card-shine border-white/10 dark:border-white/5"
                >
                  <CardHeader className="pb-2 pt-5 px-5">
                    <div
                      className={`inline-flex p-3 ${feature.iconBg} rounded-xl mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}
                    >
                      <Icon className={`h-5 w-5 ${feature.iconColor}`} />
                    </div>
                    <CardTitle className="text-lg font-semibold">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* CTA Section - Enhanced */}
        <div className="relative mb-16 fade-in-up">
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-3xl blur-2xl opacity-20" />
          <div className="relative glass-subtle rounded-3xl overflow-hidden border border-white/20">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-accent/80" />
            <div className="absolute inset-0 noise-overlay" />
            <div className="relative px-6 py-12 md:py-16 md:px-12 text-center">
              <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
                Ready to explore temporal networks?
              </h2>
              <p className="text-white/80 mb-8 max-w-2xl mx-auto text-base md:text-lg">
                Upload your data and start analyzing network evolution in
                minutes. No format restrictions, no size limits.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/upload">
                  <Button
                    size="lg"
                    className="px-8 h-12 text-base bg-white text-primary hover:bg-white/90 shadow-xl hover:shadow-2xl btn-interactive group"
                  >
                    <Upload className="mr-2 h-5 w-5 group-hover:-translate-y-0.5 transition-transform" />
                    Upload Your Data
                  </Button>
                </Link>
                <Link href="/dashboard?demo=true">
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-8 h-12 text-base border-white/30 text-white hover:bg-white/10 glass group"
                  >
                    <PlayCircle className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                    View Demo
                  </Button>
                </Link>
              </div>
              <p className="mt-6 text-white/60 text-sm">
                No credit card required • Free for academic use
              </p>
            </div>
          </div>
        </div>

        {/* Two Column Layout - Tech Stack & Data Format Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12 stagger-children">
          {/* Technology Stack */}
          <Card className="glass hover-lift border-white/10 dark:border-white/5 h-full">
            <CardHeader className="pb-3 pt-5 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <div className="p-2 bg-primary/10 rounded-lg mr-3">
                    <Cpu className="h-5 w-5 text-primary" />
                  </div>
                  Technology Stack
                </CardTitle>
                <Badge variant="secondary" className="text-xs glass-subtle">
                  Production Ready
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid grid-cols-2 gap-3">
                {techStack.map((tech, index) => {
                  const Icon = tech.icon;
                  return (
                    <div
                      key={index}
                      className={`glass-subtle rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] border border-white/10 group`}
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`p-2 rounded-lg ${tech.bg} group-hover:scale-110 transition-transform`}
                        >
                          <Icon className={`h-4 w-4 ${tech.color}`} />
                        </div>
                        <div>
                          <div
                            className={`font-semibold ${tech.color} text-sm`}
                          >
                            {tech.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {tech.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center mt-5 pt-4 border-t border-white/10">
                <p className="text-xs text-muted-foreground flex items-center">
                  <Github className="h-3.5 w-3.5 mr-1.5" />
                  Open source • MIT license
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Data Format Guidance */}
          <Card className="glass hover-lift border-white/10 dark:border-white/5 h-full">
            <CardHeader className="pb-3 pt-5 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <div className="p-2 bg-accent/10 rounded-lg mr-3">
                    <Users className="h-5 w-5 text-accent-foreground" />
                  </div>
                  Data Format Guidance
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-xs glass-subtle border-white/20"
                >
                  <Database className="h-3 w-3 mr-1" />
                  Any Format
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="space-y-4">
                {/* Recommended Fields */}
                <div className="glass-subtle rounded-xl p-4 border border-primary/10">
                  <h4 className="text-xs font-semibold text-primary mb-3 flex items-center">
                    <Award className="h-3.5 w-3.5 mr-1.5" />
                    Recommended Fields
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {requiredFields.map((field) => (
                      <div
                        key={field.name}
                        className="bg-white dark:bg-gray-900/50 rounded-md p-2 border border-blue-100 dark:border-blue-900"
                      >
                        <div className="flex items-center mb-0.5">
                          <div
                            className={`w-1.5 h-1.5 rounded-full bg-${field.color}-500 mr-1`}
                          />
                          <code className="text-xs font-mono font-medium text-blue-700 dark:text-blue-300">
                            {field.name}
                          </code>
                        </div>
                        <p className="text-[10px] text-gray-600 dark:text-gray-400 ml-2.5">
                          {field.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optional Fields & Smart Detection */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center">
                      <Activity className="h-3.5 w-3.5 mr-1 text-green-500" />
                      Optional
                    </h4>
                    <ul className="space-y-1.5">
                      {optionalFields.map((field) => (
                        <li key={field.name} className="flex items-start">
                          <div
                            className={`w-1 h-1 rounded-full bg-${field.color}-500 mt-1.5 mr-1.5`}
                          />
                          <div>
                            <code className="text-[10px] font-mono bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">
                              {field.name}
                            </code>
                            <span className="text-[10px] text-gray-600 dark:text-gray-400 ml-1">
                              {field.desc}
                            </span>
                          </div>
                        </li>
                      ))}
                      <li className="flex items-start">
                        <div className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 mr-1.5" />
                        <span className="text-[10px] text-gray-600 dark:text-gray-400">
                          Any additional columns preserved
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-purple-800 dark:text-purple-300 mb-2 flex items-center">
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                      Smart Detection
                    </h4>
                    <ul className="space-y-1">
                      <li className="flex items-start text-[10px] text-purple-700/80 dark:text-purple-400/80">
                        <span className="mr-1.5">•</span>
                        Auto-detects temporal columns
                      </li>
                      <li className="flex items-start text-[10px] text-purple-700/80 dark:text-purple-400/80">
                        <span className="mr-1.5">•</span>
                        Infers network structure
                      </li>
                      <li className="flex items-start text-[10px] text-purple-700/80 dark:text-purple-400/80">
                        <span className="mr-1.5">•</span>
                        Handles missing data
                      </li>
                    </ul>
                    <div className="mt-2 pt-1 border-t border-purple-200/50 dark:border-purple-800/50">
                      <p className="text-[9px] text-purple-600/70 dark:text-purple-400/70">
                        CSV, Excel, JSON, Parquet
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          <Separator className="mb-4" />
          <p>Temporal Network Explorer • Built by Group 12</p>
        </div>
      </div>
    </main>
  );
}
