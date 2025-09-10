"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [visible, setVisible] = useState(false);
  const [hasShownSuccessToast, setHasShownSuccessToast] = useState(false);
  const router = useRouter();

  // Lightweight scroll handler using vanilla JavaScript
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const scrollProgress = scrollY / (document.documentElement.scrollHeight - windowHeight);
      
      if (scrollProgress < 0.05) {
        setVisible(false);
      } else {
        setVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check if user's email domain is allowed
  const isAllowedDomain = useCallback(() => {
    if (!user?.emailAddresses?.[0]?.emailAddress) return false;
    const email = user.emailAddresses[0].emailAddress;
    const domain = email.split('@')[1];
    return ALLOWED_DOMAINS.includes(domain);
  }, [user]);

  // Show success toast when user signs in with allowed domain
  useEffect(() => {
    if (isSignedIn && user && isAllowedDomain()) {
      // Check if we've already shown the toast for this user session
      const toastShownKey = `toast_shown_${user.id}`;
      const hasShownToast = localStorage.getItem(toastShownKey);
      
      if (!hasShownToast && !hasShownSuccessToast) {
        toast.success("Account created successfully!", {
          style: {
            background: '#10B981',
            color: 'white',
            border: '1px solid #059669',
          },
          duration: 3000,
        });
        setHasShownSuccessToast(true);
        // Mark that we've shown the toast for this user session
        localStorage.setItem(toastShownKey, 'true');
        
        // Clean up the localStorage entry after 5 minutes
        setTimeout(() => {
          localStorage.removeItem(toastShownKey);
        }, 5 * 60 * 1000);
      }
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
          });
        } catch (error) {
          console.error("Error deleting account:", error);
        }
      };
      
      deleteAccount();
    }
  }, [isSignedIn, user, isAllowedDomain, signOut]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
      toast.success("Signed out successfully!");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Error signing out");
    }
  };

  return (
    <div
      className={cn(
        "fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-in-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4",
        className
      )}
    >
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-2">
        <div className="flex items-center gap-2">
          {/* Navigation Items */}
          <div className="flex items-center gap-1">
            {navItems.map((item, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onClick={() => router.push(item.link)}
                className="h-10 w-10 p-0 rounded-xl hover:bg-white/80 transition-all duration-200"
                title={item.name}
              >
                {item.icon}
              </Button>
            ))}
          </div>

          {/* Separator */}
          <div className="w-px h-8 bg-gray-200 mx-2" />

          {/* User Section */}
          <div className="flex items-center gap-2">
            {showBadges && (
              <>
                {/* E-Wallet Badge */}
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 px-3 py-1.5 rounded-full text-sm font-bold shadow-md">
                  ₹{eWalletAmount}
                </div>

                {/* Cart Badge */}
                <div className="bg-gradient-to-r from-orange-400 to-orange-500 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-md relative">
                  🛒 {cartCount}
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </div>
              </>
            )}

            {/* User Authentication */}
            {!isSignedIn ? (
              <SignInButton mode="modal">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 hover:from-yellow-500 hover:to-yellow-600 font-bold rounded-xl transition-all duration-200"
                >
                  Sign In
                </Button>
              </SignInButton>
            ) : (
              <div className="flex items-center gap-2">
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "h-8 w-8"
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="h-8 px-3 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                >
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
