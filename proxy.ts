import { clerkMiddleware } from "@clerk/nextjs/server";

const publicRoutes = ["/", "/products", "/about", "/sign-in", "/sign-up"];

export default clerkMiddleware(async (auth, request) => {
  const path = request.nextUrl.pathname;
  const isPublic = publicRoutes.some(
    (route) => path === route || path.startsWith(route + "/")
  );
  if (!isPublic) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
