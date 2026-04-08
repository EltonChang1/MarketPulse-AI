"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Vite + React Router port of the visual language from
 * https://21st.dev/community/components/erikx/sign-in-flow-1/default
 * (no Next.js Link; no WebGL — CSS backdrop for smaller bundle / fewer runtime issues).
 */

function AnimatedNavLink({ to, children }) {
  const a11yLabel = typeof children === "string" ? children : undefined;
  return (
    <Link
      to={to}
      aria-label={a11yLabel}
      className="group relative inline-flex h-5 shrink-0 overflow-hidden rounded-sm text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      {/* Two fixed-height rows + exact translate so only one label shows in h-5 viewport (avoids “Home Home” overlap). */}
      <span
        aria-hidden={a11yLabel ? true : undefined}
        className="flex h-10 flex-col transition-transform duration-300 ease-out group-hover:-translate-y-5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
      >
        <span className="flex h-5 shrink-0 items-center whitespace-nowrap text-zinc-400">{children}</span>
        <span className="flex h-5 shrink-0 items-center whitespace-nowrap text-white">{children}</span>
      </span>
    </Link>
  );
}

function AuthFlowNavbar() {
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [headerShapeClass, setHeaderShapeClass] = useState("rounded-full");
  const shapeTimeoutRef = useRef(null);

  const toggleMenu = () => setIsOpen((v) => !v);

  useEffect(() => {
    if (shapeTimeoutRef.current) clearTimeout(shapeTimeoutRef.current);
    if (isOpen) {
      setHeaderShapeClass("rounded-xl");
    } else {
      shapeTimeoutRef.current = setTimeout(() => setHeaderShapeClass("rounded-full"), 300);
    }
    return () => {
      if (shapeTimeoutRef.current) clearTimeout(shapeTimeoutRef.current);
    };
  }, [isOpen]);

  const logoElement = (
    <div className="relative flex h-5 w-5 items-center justify-center">
      <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-zinc-200 opacity-80" />
      <span className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-zinc-200 opacity-80" />
      <span className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-zinc-200 opacity-80" />
      <span className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-zinc-200 opacity-80" />
    </div>
  );

  const navLinks = [
    { label: "Home", to: "/" },
    { label: "Briefings", to: "/briefings" },
    { label: "Portfolio", to: "/portfolio" },
    { label: "Classic", to: "/classic" },
  ];

  return (
    <header
      className={cn(
        "fixed left-1/2 top-6 z-20 flex w-[calc(100%-2rem)] -translate-x-1/2 flex-col items-center border border-[#333] bg-[#1f1f1f]/[0.55] py-3 pl-6 pr-6 backdrop-blur-sm transition-[border-radius] duration-0 ease-in-out sm:w-auto",
        headerShapeClass
      )}
    >
      <div className="flex w-full items-center justify-between gap-x-6 sm:gap-x-8">
        <Link to="/" className="flex items-center gap-2" aria-label="MarketPulse home">
          {logoElement}
        </Link>

        <nav className="hidden items-center space-x-4 text-sm sm:flex sm:space-x-6">
          {navLinks.map((link) => (
            <AnimatedNavLink key={link.to} to={link.to}>
              {link.label}
            </AnimatedNavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex sm:gap-3">
          {pathname === "/signin" ? (
            <Link
              to="/signup"
              className="relative z-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-300 px-4 py-2 text-xs font-semibold text-black transition-all duration-200 hover:from-gray-200 hover:to-gray-400 sm:text-sm"
            >
              Sign up
            </Link>
          ) : (
            <Link
              to="/signin"
              className="w-full rounded-full border border-[#333] bg-[rgba(31,31,31,0.62)] px-4 py-2 text-xs text-zinc-300 transition-colors duration-200 hover:border-white/50 hover:text-white sm:w-auto sm:text-sm"
            >
              Log in
            </Link>
          )}
        </div>

        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35 sm:hidden"
          onClick={toggleMenu}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
        </button>
      </div>

      <div
        className={cn(
          "flex w-full flex-col items-center overflow-hidden transition-all duration-300 ease-in-out sm:hidden",
          isOpen ? "max-h-[600px] pt-4 opacity-100" : "pointer-events-none max-h-0 pt-0 opacity-0"
        )}
      >
        <nav className="flex w-full flex-col items-center space-y-4 text-base">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="w-full text-center text-zinc-300 transition-colors hover:text-white"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 flex w-full flex-col items-center space-y-4">
          {pathname === "/signin" ? (
            <Link
              to="/signup"
              className="w-full rounded-full bg-gradient-to-br from-gray-100 to-gray-300 py-2 text-center text-xs font-semibold text-black"
              onClick={() => setIsOpen(false)}
            >
              Sign up
            </Link>
          ) : (
            <Link
              to="/signin"
              className="w-full rounded-full border border-[#333] bg-[rgba(31,31,31,0.62)] px-4 py-2 text-center text-xs text-zinc-300"
              onClick={() => setIsOpen(false)}
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function AuthFlowBackdrop({ className }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 z-0", className)} aria-hidden>
      <div className="auth-flow-dot-layer absolute inset-0 bg-black" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.95)_0%,transparent_72%)]" />
      <div className="absolute left-0 right-0 top-0 h-1/3 bg-gradient-to-b from-black to-transparent" />
    </div>
  );
}

/**
 * Full-screen shell for signup (and optionally sign-in) matching 21st “sign-in flow” density and motion.
 */
export function SignUpAuthShell({ title, subtitle, children, footer }) {
  const reduceMotion = useReducedMotion();
  const inner = (
    <>
      <div className="space-y-1">
        <h1 className="text-[2.25rem] font-bold leading-[1.1] tracking-tight text-white sm:text-[2.5rem]">{title}</h1>
        {subtitle ? <p className="text-lg font-light text-white/70 sm:text-[1.35rem]">{subtitle}</p> : null}
      </div>
      {children}
      {footer ? <div className="pt-6">{footer}</div> : null}
    </>
  );

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-black text-white">
      <AuthFlowBackdrop />
      <div className="relative z-10 flex min-h-screen flex-1 flex-col">
        <AuthFlowNavbar />
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-12 pt-[120px] sm:pt-[140px]">
          <div className="w-full max-w-sm">
            {reduceMotion ? (
              <div className="space-y-8 text-center">{inner}</div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="space-y-8 text-center"
              >
                {inner}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
