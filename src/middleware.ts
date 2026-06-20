export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tasks/:path*",
    "/meetings/:path*",
    "/photos/:path*",
    "/projects/:path*",
    "/products/:path*",
    "/clients/:path*",
    "/factories/:path*",
    "/sales/:path*",
    "/stats/:path*",
    "/users/:path*",
    "/admin/:path*",
  ],
};
