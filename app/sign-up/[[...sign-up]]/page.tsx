"use client";
import { SignUp } from "@clerk/nextjs";
import FloatingFoodBackground from "@/components/FloatingFoodBackground";

export default function SignUpPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Interactive Floating Food Background */}
      <FloatingFoodBackground />
      
      {/* Gradient overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-beige)]/80 via-[var(--color-mint)]/70 to-[var(--color-yellow)]/80 z-10" />
      
      {/* Content */}
      <div className="relative z-20 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-[var(--color-tomato)] mb-2 drop-shadow-lg">
              Join WeDine
            </h1>
            <p className="text-[var(--color-deep-blue)] text-lg font-medium drop-shadow">
              Create your account with your college email
            </p>
            <p className="text-sm text-[var(--color-coral)] mt-2 animate-pulse">
              
            </p>
          </div>
          
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50 relative overflow-hidden">
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer" />
            
            <SignUp 
              appearance={{
                elements: {
                  formButtonPrimary: "bg-[var(--color-tomato)] hover:bg-[var(--color-coral)] text-white font-poppins transition-all duration-300 transform hover:scale-105",
                  card: "bg-transparent shadow-none",
                  headerTitle: "text-[var(--color-tomato)] font-poppins text-2xl",
                  headerSubtitle: "text-[var(--color-deep-blue)]",
                  socialButtonsBlockButton: "bg-[var(--color-yellow)] text-[var(--color-deep-blue)] hover:bg-[var(--color-tomato)] font-poppins transition-all duration-300",
                  formFieldInput: "border-[var(--color-coral)] focus:border-[var(--color-tomato)] font-poppins transition-all duration-300",
                  footerActionLink: "text-[var(--color-tomato)] hover:text-[var(--color-coral)] font-poppins transition-all duration-300",
                  formFieldLabel: "text-[var(--color-deep-blue)] font-poppins",
                  dividerLine: "bg-[var(--color-coral)]",
                  dividerText: "text-[var(--color-deep-blue)] font-poppins",
                },
                variables: {
                  colorPrimary: "#FF4B3E",
                  colorText: "#2B2D42",
                  colorBackground: "#FFF3E2",
                },
              }}
              afterSignUpUrl="/"
              signInUrl="/sign-in"
            />
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-[var(--color-deep-blue)] font-medium">
              Only authorized college domains are allowed
            </p>
            <p className="text-xs text-[var(--color-coral)] mt-2 font-medium">
              Example: saravanaiyyappan.s@vitstudent.ac.in
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  );
} 