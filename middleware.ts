import { clerkMiddleware } from "@clerk/nextjs/server";

// This middleware will protect all routes by default
// Users must be signed in to access any page except the public routes
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)",
    "/",
    "/(api|trpc)(.*)",
    "/((?!sign-in|sign-up|unauthorized|api/webhooks).*)",
  ],
};