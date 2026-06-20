export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tasks/:path*",
    "/projects/:path*",
    "/clients/:path*",
    "/factories/:path*",
    "/sales/:path*",
    "/stats/:path*",
    "/users/:path*",
    "/admin/:path*",
  ],
};
