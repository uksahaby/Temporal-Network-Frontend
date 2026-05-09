"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, User, Lock, Github } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, error, clearError, checkAuth } =
    useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);

    const success = await login({ email, password });

    setIsSubmitting(false);

    if (success) {
      router.push("/dashboard");
    }
  };

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#5B5FC7]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-white animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-5xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[550px]">
        {/* Left Panel - Image Background */}
        <div className="md:w-[45%] relative min-h-[250px] md:min-h-[550px] overflow-hidden">
          {/* Background Image */}
          <Image
            src="/liverpoolB.jpeg"
            alt="University of Liverpool"
            fill
            className="object-cover"
            priority
          />
          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#5B5FC7]/90 via-[#5B5FC7]/70 to-black/60" />

          {/* Content on top of image */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-6">
            {/* Logo */}
            <div className="mb-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 inline-block border border-white/20">
                <Image
                  src="/livTr.png"
                  alt="University of Liverpool"
                  width={120}
                  height={48}
                  className="object-contain brightness-0 invert"
                />
              </div>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold mb-3 drop-shadow-lg">
              Hello, Welcome!
            </h2>
            <p className="text-white/90 mb-6 text-sm max-w-xs">
              Explore temporal networks and discover insights with our advanced
              visualization platform
            </p>
            <p className="text-white/80 mb-3 text-sm">
              Don&apos;t have an account?
            </p>
            <Link href="/register">
              <Button
                variant="outline"
                className="border-2 border-white text-white bg-white/10 backdrop-blur-sm hover:bg-white hover:text-[#5B5FC7] px-8 py-2 rounded-full font-semibold transition-all duration-300"
              >
                Register
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="md:w-[55%] flex items-center justify-center p-6 md:p-10 bg-white dark:bg-gray-900">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white text-center mb-2">
              Login
            </h1>
            <p className="text-gray-500 text-center mb-8">
              Sign in to continue to your dashboard
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert
                  variant="destructive"
                  className="bg-red-50 border-red-200"
                >
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Username/Email Input */}
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="h-12 pl-4 pr-12 rounded-xl border-gray-200 dark:border-gray-700 focus:border-[#5B5FC7] focus:ring-[#5B5FC7]/20 bg-gray-50 dark:bg-gray-800"
                />
                <User className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>

              {/* Password Input */}
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  minLength={6}
                  className="h-12 pl-4 pr-12 rounded-xl border-gray-200 dark:border-gray-700 focus:border-[#5B5FC7] focus:ring-[#5B5FC7]/20 bg-gray-50 dark:bg-gray-800"
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>

              {/* Forgot Password */}
              <div className="text-right">
                <Link
                  href="#"
                  className="text-sm text-gray-500 hover:text-[#5B5FC7] transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full h-12 bg-[#5B5FC7] hover:bg-[#4A4EB5] text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-[#5B5FC7]/25"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>

              {/* Social Login */}
              <div className="pt-4">
                <p className="text-center text-sm text-gray-500 mb-4">
                  or login with social platforms
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    type="button"
                    className="w-11 h-11 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:border-[#5B5FC7] hover:text-[#5B5FC7] hover:bg-[#5B5FC7]/5 transition-all"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="w-11 h-11 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:border-[#5B5FC7] hover:text-[#5B5FC7] hover:bg-[#5B5FC7]/5 transition-all"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="w-11 h-11 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:border-[#5B5FC7] hover:text-[#5B5FC7] hover:bg-[#5B5FC7]/5 transition-all"
                  >
                    <Github className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    className="w-11 h-11 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:border-[#5B5FC7] hover:text-[#5B5FC7] hover:bg-[#5B5FC7]/5 transition-all"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Mobile Register Link */}
              <p className="text-sm text-center text-gray-500 md:hidden pt-4">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="text-[#5B5FC7] font-semibold hover:underline"
                >
                  Register
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
