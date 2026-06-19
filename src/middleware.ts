export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/clients/:path*",
    "/factories/:path*",
    "/stats/:path*",
    "/users/:path*",
    "/admin/:path*",
  ],
};
