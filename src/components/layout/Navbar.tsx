"use client";

import { Leaf, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/discover", label: "Discover" },
  { href: "/profile", label: "Profile" },
  { href: "/rewards", label: "Rewards" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/admin", label: "Admin" }
];

const easing = "ease-[cubic-bezier(0.22,1,0.36,1)]";

export function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isHome = pathname === "/";
  const isCompact = isHome && !isScrolled && !isMenuOpen;
  const showsFullNavigation = !isCompact;

  useEffect(() => {
    let frame = 0;

    const syncScrollState = () => {
      const nextScrolled = window.scrollY > 80;
      setIsScrolled((current) => (current === nextScrolled ? current : nextScrolled));

      if (nextScrolled) {
        setIsMenuOpen((current) => (current ? false : current));
      }
    };

    syncScrollState();

    const onScroll = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        syncScrollState();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMenuOpen]);

  const navClasses = isHome && !isScrolled
    ? "border-white/30 bg-[linear-gradient(135deg,rgba(255,255,255,0.18)_0%,rgba(174,214,187,0.1)_38%,rgba(7,30,18,0.42)_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.34),0_18px_42px_rgba(3,10,8,0.26)] backdrop-blur-[24px] backdrop-saturate-150"
    : "border-white/16 bg-[linear-gradient(135deg,rgba(255,255,255,0.1)_0%,rgba(10,32,20,0.74)_54%,rgba(4,15,11,0.84)_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_18px_44px_rgba(3,10,8,0.24)] backdrop-blur-2xl backdrop-saturate-150";
  const brandBadgeClasses = isHome && !isScrolled
    ? "bg-white/14 text-moss ring-white/28 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]"
    : "bg-white/12 text-moss ring-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_20px_rgba(0,0,0,0.12)]";
  const navLinkClasses = "text-white/74 hover:text-white";
  const ctaClasses = isHome && !isScrolled
    ? "bg-white/16 text-white shadow-lg shadow-black/18 hover:bg-white/24"
    : "bg-white/12 text-white shadow-lg shadow-black/16 hover:bg-white/18";
  const mobileButtonClasses = isHome && !isScrolled
    ? "bg-white/14 text-white ring-white/28 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]"
    : "bg-white/12 text-white ring-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_12px_rgba(0,0,0,0.14)]";
  const mobilePanelClasses = isHome && !isScrolled ? "border-white/16" : "border-white/10";
  const desktopToggleClasses = isMenuOpen || !showsFullNavigation
    ? "md:w-10 md:opacity-100 md:scale-100"
    : "md:w-0 md:opacity-0 md:scale-75 md:pointer-events-none";

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-4">
      <button
        aria-label="Close navigation"
        className={`fixed inset-0 z-0 bg-black/22 opacity-0 backdrop-blur-sm transition-opacity duration-500 ${easing} ${
          isMenuOpen ? "opacity-100" : "pointer-events-none"
        }`}
        onClick={closeMenu}
        type="button"
      />

      <nav
        className={`relative z-10 mx-auto flex w-full flex-wrap items-center overflow-hidden rounded-[24px] border px-4 py-3 transition-[max-width,max-height,background-color,border-color,box-shadow,border-radius] duration-[560ms] ${easing} ${
          showsFullNavigation ? "max-w-7xl" : "max-w-[320px] sm:max-w-[350px]"
        } ${isMenuOpen ? "max-h-[720px]" : "max-h-20"} ${navClasses}`}
      >
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="PlantConnect home" onClick={closeMenu}>
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full ring-1 transition-[background-color,color,box-shadow] duration-500 ${easing} ${brandBadgeClasses}`}
          >
            <Leaf size={20} aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-normal text-white">PlantConnect</span>
        </Link>

        <div
          className={`hidden min-w-0 items-center justify-center overflow-hidden whitespace-nowrap transition-[flex-grow,width,opacity,transform] duration-500 ${easing} md:flex ${
            showsFullNavigation ? "flex-1 opacity-100" : "w-0 opacity-0 pointer-events-none"
          }`}
        >
          {links.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 px-3 text-sm font-medium transition-[color,opacity,transform] duration-300 ${
                showsFullNavigation ? "translate-y-0 scale-100 opacity-100" : "translate-y-1.5 scale-[0.98] opacity-0"
              } ${navLinkClasses}`}
              onClick={closeMenu}
              style={{ transitionDelay: showsFullNavigation ? `${index * 55}ms` : "0ms" }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div
          className={`hidden shrink-0 items-center gap-3 overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-500 ${easing} md:flex ${
            showsFullNavigation ? "max-w-[240px] translate-y-0 opacity-100" : "max-w-0 translate-y-1.5 opacity-0 pointer-events-none"
          }`}
          style={{ transitionDelay: showsFullNavigation ? "160ms" : "0ms" }}
        >
          <Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-white/82 transition-colors duration-300 hover:text-white" onClick={closeMenu}>
            Log in
          </Link>
          <Link
            href="/signup"
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-300 ${ctaClasses}`}
            onClick={closeMenu}
          >
            Join network
          </Link>
        </div>

        <div className={`ml-auto flex w-10 shrink-0 overflow-hidden transition-[width,opacity,transform] duration-500 ${easing} ${desktopToggleClasses}`}>
          <button
            aria-controls="plantconnect-menu"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 transition-[background-color,color,box-shadow] duration-300 ${mobileButtonClasses}`}
            onClick={() => setIsMenuOpen((current) => !current)}
            type="button"
          >
            <Menu
              className={`absolute transition-all duration-300 ${isMenuOpen ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
              size={20}
              aria-hidden="true"
            />
            <X
              className={`absolute transition-all duration-300 ${isMenuOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`}
              size={20}
              aria-hidden="true"
            />
          </button>
        </div>

        <div
          id="plantconnect-menu"
          className={`basis-full overflow-hidden transition-[max-height,opacity] duration-500 ${easing} md:hidden ${
            isMenuOpen ? "max-h-[560px] opacity-100" : "pointer-events-none max-h-0 opacity-0"
          }`}
        >
          <div className={`mt-3 border-t pt-3 ${mobilePanelClasses}`}>
            {links.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-xl px-4 py-3 text-sm font-medium text-white/82 transition-[background-color,color,opacity,transform] duration-300 hover:bg-white/10 hover:text-white ${
                  isMenuOpen ? "translate-y-0 scale-100 opacity-100" : "translate-y-1.5 scale-[0.98] opacity-0"
                }`}
                onClick={closeMenu}
                style={{ transitionDelay: isMenuOpen ? `${(index + 1) * 60}ms` : "0ms" }}
              >
                {link.label}
              </Link>
            ))}
            <div className="grid grid-cols-2 gap-2 px-1 pb-1 pt-3">
              <Link
                href="/login"
                className={`rounded-xl px-4 py-3 text-center text-sm font-semibold text-white transition-[background-color,opacity,transform] duration-300 hover:bg-white/10 ${
                  isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
                }`}
                onClick={closeMenu}
                style={{ transitionDelay: isMenuOpen ? "480ms" : "0ms" }}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className={`rounded-xl px-4 py-3 text-center text-sm font-semibold transition-[background-color,color,opacity,transform] duration-300 ${ctaClasses} ${
                  isMenuOpen ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
                }`}
                onClick={closeMenu}
                style={{ transitionDelay: isMenuOpen ? "540ms" : "0ms" }}
              >
                Join
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
