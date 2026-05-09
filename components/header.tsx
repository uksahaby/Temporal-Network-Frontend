"use client";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ThemeToggleButton } from "./ThemeToggleButton";
import { Card, CardContent } from "./ui/card";

export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return (
    <header>
      <nav
        data-state={menuState && "active"}
        className="fixed z-50 w-full px-2"
      >
        <div
          className={cn(
            "mx-auto mt-2 max-w-6xl px-6 transition-all duration-500 ease-out lg:px-12",
            isScrolled &&
              "glass max-w-4xl rounded-2xl border border-white/20 dark:border-white/10 shadow-xl lg:px-5",
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-1">
            <div className="flex w-full justify-between lg:w-auto">
              <div className="overflow-hidden rounded-2xl w-25 h-20 hover-lift transition-all duration-300">
                <Image
                  src="/livTr.PNG"
                  alt="Liv logo"
                  width={160}
                  height={32}
                  className="object-cover w-full h-full"
                />
              </div>
              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState == true ? "Close Menu" : "Open Menu"}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden group"
              >
                <Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-300 group-hover:text-primary transition-colors" />
                <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-300 group-hover:text-primary transition-colors" />
              </button>
            </div>

            <div className="bg-background in-data-[state=active]:block lg:in-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl glass border border-white/20 p-6 shadow-2xl md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className={cn(
                    "glass border-white/20 hover:border-primary/50",
                    isScrolled && "lg:hidden",
                  )}
                >
                  <Link href="/login">
                    <span>Login</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className={cn("btn-interactive", isScrolled && "lg:hidden")}
                >
                  <Link href="/register">
                    <span>Sign Up</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className={cn(
                    "btn-interactive",
                    isScrolled ? "lg:inline-flex" : "hidden",
                  )}
                >
                  <Link href="/register">
                    <span>Get Started</span>
                  </Link>
                </Button>
                <ThemeToggleButton />
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
