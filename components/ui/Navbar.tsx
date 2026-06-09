"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { FaCircleUser, FaBars, FaXmark, FaChevronDown } from "react-icons/fa6";
import Button from "./Button";

type AuthState = "loading" | "authenticated" | "unauthenticated";

/**
 * Site-wide navigation bar.
 * - Glassmorphism background via backdrop-filter
 * - Hides on scroll-down, reveals on scroll-up (Framer Motion)
 * - Auth state machine: loading → skeleton, unauthenticated → CTA buttons, authenticated → profile badge
 */
export default function Navbar() {
  const { t } = useTranslation();
  const { data: session, status } = useSession();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  const profileRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();

  const authState: AuthState = status;

  const navLinks = [
    { name: t("nav.about"),    href: "/about"    },
    { name: t("nav.features"), href: "/features" },
    { name: t("nav.usecases"), href: "/usecase"  },
    { name: t("nav.docs"),     href: "/docs"     },
  ];

  useMotionValueEvent(scrollY, "change", (current) => {
    const diff = current - lastScrollY.current;
    if (diff > 6 && current > 80) {
      setIsNavVisible(false);
      setIsProfileDropdownOpen(false);
    } else if (diff < -6) {
      setIsNavVisible(true);
    }
    lastScrollY.current = current;
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    setIsProfileDropdownOpen(false);
    setIsMobileMenuOpen(false);
    await signOut({ callbackUrl: "/" });
  }

  return (
    <motion.header
      animate={{ y: isNavVisible ? 0 : "-100%" }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "rgba(13, 15, 11, 0.72)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.055)",
      }}
    >
      <nav className="w-full flex flex-row items-center justify-between py-5 px-5 md:px-16  mx-auto">
        {/* Logo */}
        <Link href="/" className="relative w-28 h-9 shrink">
          <Image
            src="/images/logos/logo_white_No_Subtitle_Transparent_Wide.png"
            alt="Instra Logo"
            title="Instra"
            fill
            style={{ objectFit: "contain", objectPosition: "left" }}
            priority
          />
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex flex-row gap-8 items-center">
          {navLinks.map(({ name, href }) => (
            <Link
              key={href}
              href={href}
              className="text-on-surface-variant hover:text-on-surface text-sm tracking-wide transition-colors duration-150 font-light"
            >
              {name}
            </Link>
          ))}
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex flex-row gap-3 items-center">
          {authState === "loading" && (
            <div className="w-7 h-7 rounded-full animate-pulse" style={{ background: "rgba(255,255,255,0.08)" }} />
          )}

          {authState === "unauthenticated" && (
            <>
              <Button href="/signin" variant="secondary">{t("nav.singin")}</Button>
              <Button href="/signup" variant="primary">{t("nav.singup")}</Button>
            </>
          )}

          {authState === "authenticated" && (
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setIsProfileDropdownOpen((p) => !p)}
                aria-label={t("nav.profile")}
                aria-expanded={isProfileDropdownOpen}
                className="flex items-center gap-1.5 transition-opacity duration-150 hover:opacity-80 cursor-pointer"
              >
                <FaCircleUser size={26} style={{ color: "var(--color-accent-bone)" }} />
                <FaChevronDown
                  size={10}
                  style={{ color: "var(--color-outline)" }}
                  className={`transition-transform duration-200 ${isProfileDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isProfileDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute right-0 top-full mt-3 min-w-48 py-1 rounded"
                  style={{
                    background: "rgba(26, 28, 24, 0.92)",
                    backdropFilter: "blur(24px) saturate(160%)",
                    WebkitBackdropFilter: "blur(24px) saturate(160%)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    boxShadow: "0 16px 40px rgba(0, 0, 0, 0.55), 0 0 0 0.5px rgba(255,255,255,0.04)",
                  }}
                >
                  {session?.user?.name && (
                    <div className="px-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-xs font-mono tracking-widest truncate" style={{ color: "var(--color-on-surface-variant)" }}>
                        {session.user.name}
                      </p>
                    </div>
                  )}
                  <Link
                    href="/dashboard"
                    onClick={() => setIsProfileDropdownOpen(false)}
                    className="flex items-center px-4 py-2.5 text-sm transition-colors duration-100"
                    style={{ color: "var(--color-on-surface)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {t("nav.dashboard")}
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setIsProfileDropdownOpen(false)}
                    className="flex items-center px-4 py-2.5 text-sm transition-colors duration-100"
                    style={{ color: "var(--color-on-surface)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {t("nav.profile")}
                  </Link>
                  <div className="px-3 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <Button
                      onClick={handleSignOut}
                      variant="secondary"
                      className="w-full justify-center"
                      style={{ borderColor: "var(--color-error)", color: "var(--color-error)" }}
                    >
                      {t("nav.signout")}
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setIsMobileMenuOpen((p) => !p)}
          aria-label={isMobileMenuOpen ? t("nav.menu_close") : t("nav.menu_open")}
          aria-expanded={isMobileMenuOpen}
          className="md:hidden flex items-center justify-center w-9 h-9 rounded transition-colors duration-150 cursor-pointer"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          <motion.span
            key={isMobileMenuOpen ? "close" : "open"}
            initial={{ opacity: 0, rotate: -15 }}
            animate={{ opacity: 1, rotate: 0 }}
            transition={{ duration: 0.15 }}
          >
            {isMobileMenuOpen ? <FaXmark size={18} /> : <FaBars size={18} />}
          </motion.span>
        </button>
      </nav>

      {/* Mobile menu panel */}
      <motion.div
        initial={false}
        animate={isMobileMenuOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
        className="md:hidden overflow-hidden"
        style={{ borderTop: isMobileMenuOpen ? "1px solid rgba(255,255,255,0.055)" : "none" }}
      >
        <div className="flex flex-col px-5 py-4 gap-0 max-w-[1280px] mx-auto">
          {navLinks.map(({ name, href }, i) => (
            <motion.div
              key={href}
              initial={{ opacity: 0, x: -8 }}
              animate={isMobileMenuOpen ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
              transition={{ duration: 0.2, delay: isMobileMenuOpen ? i * 0.04 : 0 }}
            >
              <Link
                href={href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block py-3 text-sm font-light tracking-wide transition-colors duration-150"
                style={{
                  color: "var(--color-on-surface-variant)",
                  borderBottom: "1px solid rgba(255,255,255,0.045)",
                }}
              >
                {name}
              </Link>
            </motion.div>
          ))}

          <motion.div
            className="pt-4 flex flex-col gap-2"
            initial={{ opacity: 0 }}
            animate={isMobileMenuOpen ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.2, delay: isMobileMenuOpen ? navLinks.length * 0.04 : 0 }}
          >
            {authState === "unauthenticated" && (
              <>
                <Button href="/signin" variant="secondary" className="w-full justify-center">{t("nav.singin")}</Button>
                <Button href="/signup" variant="primary" className="w-full justify-center">{t("nav.singup")}</Button>
              </>
            )}

            {authState === "authenticated" && (
              <div className="flex flex-col gap-2">
                {session?.user?.name && (
                  <p className="text-xs font-mono tracking-widest py-1" style={{ color: "var(--color-on-surface-variant)" }}>
                    {session.user.name}
                  </p>
                )}
                <Button href="/dashboard" variant="secondary" className="w-full justify-center">
                  {t("nav.dashboard")}
                </Button>
                <Button
                  onClick={handleSignOut}
                  variant="secondary"
                  className="w-full justify-center"
                  style={{ borderColor: "var(--color-error)", color: "var(--color-error)" }}
                >
                  {t("nav.signout")}
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </motion.header>
  );
}
