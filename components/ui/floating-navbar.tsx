"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { useUser, SignInButton, UserButton, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";

interface NavItem {
  name: string;
  link: string;
  icon?: React.ReactElement;
}

// Allowed domains for WeDine app
const ALLOWED_DOMAINS = [
  "vitstudent.ac.in",
  "vit.ac.in", 
  "vitbhopal.ac.in",
  "vitap.ac.in",
  "vitchennai.ac.in",
  // Add more domains as needed
];

export const FloatingNav = ({
  navItems,
  className,
  showBadges = false,
  eWalletAmount = 500,
  cartCount = 0,
}: {
  navItems: NavItem[];
  className?: string;
  showBadges?: boolean;
  eWalletAmount?: number | string;
  cartCount?: number;
}) => {
  const { scrollYProgress } = useScroll();
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [visible, setVisible] = useState(false);
  const [hasShownSuccessToast, setHasShownSuccessToast] = useState(false);
  const router = useRouter();

  useMotionValueEvent(scrollYProgress, "change", (current) => {
    if (typeof current === "number") {
      if (current < 0.05) {
        setVisible(false);
      } else {
        setVisible(true);
      }
    }
  });

  // Check if user's email domain is allowed
  const isAllowedDomain = useCallback(() => {
    if (!user?.emailAddresses?.[0]?.emailAddress) return false;
    const email = user.emailAddresses[0].emailAddress;
    const domain = email.split('@')[1];
    return ALLOWED_DOMAINS.includes(domain);
  }, [user]);

  // Show success toast when user signs in with allowed domain
  useEffect(() => {
    if (isSignedIn && user && isAllowedDomain() && !hasShownSuccessToast) {
      toast.success("Account created successfully!", {
        style: {
          background: '#10B981',
          color: 'white',
          border: '1px solid #059669',
        },
        duration: 3000,
      });
      setHasShownSuccessToast(true);
    }
  }, [isSignedIn, user, hasShownSuccessToast, isAllowedDomain]);

  // Auto-delete account if domain is not allowed
  useEffect(() => {
    if (isSignedIn && user && !isAllowedDomain()) {
      // Delete the account and sign out
      const deleteAccount = async () => {
        try {
          await user.delete();
          await signOut();
          
          // Show error toast after account deletion
          toast.error("Domain not allowed! Account deleted.", {
            style: {
              background: '#EF4444',
              color: 'white',
              border: '1px solid #DC2626',
            },
            duration: 4000,
            description: "Please use a valid college email address.",
          });
        } catch (error) {
          console.error("Error deleting account:", error);
          // If deletion fails, just sign out
          await signOut();
          
          // Show error toast even if deletion fails
          toast.error("Domain not allowed! Please sign in with a valid college email.", {
            style: {
              background: '#EF4444',
              color: 'white',
              border: '1px solid #DC2626',
            },
            duration: 4000,
          });
        }
      };
      deleteAccount();
    }
  }, [isSignedIn, user, signOut, isAllowedDomain]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{
          opacity: 100,
          y: -100,
        }}
        animate={{
          y: visible ? 0 : -100,
          opacity: visible ? 1 : 0,
        }}
        transition={{
          duration: 0.2,
        }}
        className={cn(
          "flex max-w-fit fixed top-10 inset-x-0 mx-auto border border-white/30 dark:border-white/[0.2] rounded-full bg-white/30 dark:bg-black/30 backdrop-blur-md shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] z-[5000] pr-2 pl-8 py-2 items-center justify-center space-x-4",
          className
        )}
      >
        {navItems.map((navItem: NavItem, idx: number) => (
          <a
            key={`link=${idx}`}
            href={navItem.link}
            className={cn(
              "font-poppins relative dark:text-neutral-50 items-center flex space-x-1 text-neutral-600 dark:hover:text-neutral-300 hover:text-neutral-500"
            )}
          >
            <span className="block sm:hidden">{navItem.icon}</span>
            <span className="hidden sm:block text-sm">{navItem.name}</span>
          </a>
        ))}

        {/* E-wallet and Cart Badges */}
        {isSignedIn && isAllowedDomain() && showBadges && (
          <div className="flex items-center gap-4 ml-4">
            {/* E-wallet badge */}
            <div className="flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 shadow-lg border border-yellow-200 text-yellow-900 font-bold text-sm backdrop-blur-md">
              <svg className="w-5 h-5 mr-1 text-yellow-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 7a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7z"/><path d="M16 11a2 2 0 110 4 2 2 0 010-4z"/></svg>
              ₹{eWalletAmount}
            </div>
            {/* Cart badge */}
            <div className="relative flex items-center">
              <button
                className="flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-blue-400 via-blue-300 to-blue-500 shadow-lg border border-blue-200 text-white font-bold text-sm backdrop-blur-md hover:scale-105 transition-transform"
                onClick={() => router.push('/cart')}
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4"/><circle cx="7" cy="21" r="1"/><circle cx="17" cy="21" r="1"/></svg>
                Cart
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-white text-blue-600 border border-blue-300 shadow-sm">{cartCount}</span>
              </button>
            </div>
          </div>
        )}

        {isSignedIn && isAllowedDomain() ? (
          <UserButton 
            appearance={{
              elements: {
                userButtonBox: "w-8 h-8",
                userButtonTrigger: "bg-[var(--color-tomato)] hover:bg-[var(--color-coral)] text-white rounded-full",
                userButtonPopoverCard: "bg-white/90 backdrop-blur-md border border-white/30",
                userButtonPopoverActionButton: "text-[var(--color-deep-blue)] hover:bg-[var(--color-tomato)] hover:text-white",
                userButtonPopoverActionButtonText: "font-poppins",
              }
            }}
          />
        ) : (
          <SignInButton mode="modal">
            <Button className="cursor-pointer font-poppins border text-sm font-medium border-neutral-200 px-4 py-2 rounded-full bg-[var(--color-deep-blue)] text-[var(--color-beige)] hover:bg-[var(--color-tomato)]">
              Sign In
            </Button>
          </SignInButton>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
