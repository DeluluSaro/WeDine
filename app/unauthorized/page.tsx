"use client";

import { Button } from "@/components/ui/button";
import { SignOutButton } from "@clerk/nextjs";
import { ArrowLeft, Shield } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--color-beige)] via-[var(--color-mint)] to-[var(--color-yellow)]">
      <div className="w-full max-w-md text-center">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-8 shadow-lg border border-white/30">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-tomato)] mb-2">
              Access Denied
            </h1>
            <p className="text-[var(--color-deep-blue)] mb-4">
              Your email domain is not authorized to access WeDine.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="bg-[var(--color-yellow)]/20 p-4 rounded-lg">
              <h3 className="font-semibold text-[var(--color-deep-blue)] mb-2">
                Allowed Domains:
              </h3>
              <ul className="text-sm text-[var(--color-deep-blue)] space-y-1">
                <li>• vitstudent.ac.in</li>
                <li>• vit.ac.in</li>
                <li>• vitbhopal.ac.in</li>
                <li>• vitap.ac.in</li>
                <li>• vitchennai.ac.in</li>
              </ul>
            </div>
            
            <div className="flex flex-col space-y-3">
              <SignOutButton>
                <Button className="w-full bg-[var(--color-coral)] hover:bg-[var(--color-tomato)] text-white">
                  Sign Out
                </Button>
              </SignOutButton>
              
              <Button 
                variant="outline" 
                className="w-full border-[var(--color-coral)] text-[var(--color-coral)] hover:bg-[var(--color-coral)] hover:text-white"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-[var(--color-coral)]">
              Need access? Contact your campus administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 