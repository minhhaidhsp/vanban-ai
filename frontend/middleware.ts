import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;

  // Các path công khai — không cần auth
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  // Landing page
  const isLandingPage = pathname === "/";

  // Đã login mà vào login/register/landing → redirect dashboard
  if (token && (isPublicPath || isLandingPage)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Chưa login mà vào dashboard → redirect login
  if (!token && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|logo_civicai.jpg).*)",
  ],
};
