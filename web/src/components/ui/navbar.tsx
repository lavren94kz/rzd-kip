// Updated src/components/ui/navbar.tsx
"use client";

import { logout } from "@/lib/actions/auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "../pocketbase-provider";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { Menu, X, CheckSquare } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ClientWrapper } from "./client-wrapper";

export function Navbar({ lng }: { lng: string }) {
  const user = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useTranslation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = async () => {
    const result = await logout();
    if (result?.redirect) {
      router.push(`/${lng}${result.redirect}`);
    }
  };

  const isActive = (path: string) => {
    return pathname === `/${lng}${path}` || pathname.startsWith(`/${lng}${path}/`);
  };

  const linkStyle = (path: string) => `
  px-4 py-2 rounded-md transition-colors inline-flex items-center
  ${
    isActive(path)
      ? "bg-primary text-primary-content hover:bg-primary-focus"
      : "hover:bg-base-200"
  }
`;

  return (
    <ClientWrapper>
      <nav className="border-b shadow-xs bg-base-100">
        <div className="navbar mx-auto max-w-7xl px-4">
          <div className="navbar-start">
            <Link
              href={`/${lng}`}
              className={`text-xl font-bold transition-colors ${
                isActive("/") ? "text-primary" : "hover:text-primary"
              }`}
            >
              PB-Next
            </Link>
          </div>

          <div className="navbar-center hidden md:flex">
            <ul className="flex items-center space-x-2">
              <li>
                <Link href={`/${lng}/about`} className={linkStyle("/about")}>
                  {t("nav.about")}
                </Link>
              </li>
              {user && (
                <li>
                  <Link href={`/${lng}/todos`} className={linkStyle("/todos")}>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Todos
                  </Link>
                </li>
              )}
            </ul>
          </div>

          <div className="navbar-end flex md:hidden">
            <LanguageSwitcher lng={lng} />
            <ThemeToggle />

            <button
              onClick={toggleMenu}
              className="btn btn-ghost btn-circle ml-2"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          <div className="navbar-end hidden md:flex items-center gap-2">
            <ul className="flex items-center space-x-2">
              {user ? (
                <>
                  <li>
                    <Link
                      href={`/${lng}/dashboard`}
                      className={linkStyle("/dashboard")}
                    >
                      {user.name || user.email}
                    </Link>
                  </li>
                  <li>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 rounded-md hover:bg-base-200 transition-colors"
                    >
                      {t("nav.logout")}
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link
                      href={`/${lng}/login`}
                      className={linkStyle("/login")}
                    >
                      {t("nav.login")}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`/${lng}/register`}
                      className={linkStyle("/register")}
                    >
                      {t("nav.register")}
                    </Link>
                  </li>
                </>
              )}
            </ul>
            <LanguageSwitcher lng={lng} />
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`
        md:hidden transition-all duration-300 ease-in-out
        ${isMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}
        overflow-hidden bg-base-100
      `}
        >
          <div className="px-4 py-2 space-y-2">
            <Link
              href={`/${lng}/about`}
              className={`block ${linkStyle("/about")}`}
              onClick={() => setIsMenuOpen(false)}
            >
              {t("nav.about")}
            </Link>
            
            {user && (
              <Link
                href={`/${lng}/todos`}
                className={`block ${linkStyle("/todos")}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Todos
              </Link>
            )}

            {user ? (
              <>
                <Link
                  href={`/${lng}/dashboard`}
                  className={`block ${linkStyle("/dashboard")}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {user.name || user.email}
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 rounded-md hover:bg-base-200 transition-colors"
                >
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  href={`/${lng}/login`}
                  className={`block ${linkStyle("/login")}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("nav.login")}
                </Link>
                <Link
                  href={`/${lng}/register`}
                  className={`block ${linkStyle("/register")}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t("nav.register")}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </ClientWrapper>
  );
}