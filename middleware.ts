import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/utils/auth";

export async function middleware(request: NextRequest) {
  console.log("=== MIDDLEWARE START ===");
  console.log("URL:", request.url);
  console.log("Pathname:", request.nextUrl.pathname);

  const token = request.cookies.get("auth-token")?.value;
  const userData = token ? verifyToken(token) : null;
  const isLoggedIn = !!userData;

  console.log("Is logged in:", isLoggedIn);

  const publicRoutes = ["/login", "/regist"];
  const isPublicRoute = publicRoutes.includes(request.nextUrl.pathname);

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

  if (isAdminRoute) {
    if (!isLoggedIn) {
      console.log("Not authenticated, redirecting to login");
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (userData.role !== "dev") {
      console.log("Not authorized for admin, redirecting to home");
      return NextResponse.redirect(new URL("/", request.url));
    }

    console.log("Admin access granted");
  }

  if (!isLoggedIn && !isPublicRoute) {
    console.log("Not authenticated, redirecting to login");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLoggedIn && isPublicRoute) {
    console.log("Already logged in, redirecting to home");
    return NextResponse.redirect(new URL("/", request.url));
  }

  console.log("Proceeding with request");
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/regist", "/settings", "/admin/:path*"],
};
