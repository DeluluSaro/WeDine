import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--color-beige)] via-[var(--color-mint)] to-[var(--color-yellow)]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-tomato)] mb-2">
            Join WeDine
          </h1>
          <p className="text-[var(--color-deep-blue)]">
            Create your account with your college email
          </p>
        </div>
        
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-8 shadow-lg border border-white/30">
          <SignUp 
            appearance={{
              elements: {
                formButtonPrimary: "bg-[var(--color-tomato)] hover:bg-[var(--color-coral)] text-white font-poppins",
                card: "bg-transparent shadow-none",
                headerTitle: "text-[var(--color-tomato)] font-poppins text-2xl",
                headerSubtitle: "text-[var(--color-deep-blue)]",
                socialButtonsBlockButton: "bg-[var(--color-yellow)] text-[var(--color-deep-blue)] hover:bg-[var(--color-tomato)] font-poppins",
                formFieldInput: "border-[var(--color-coral)] focus:border-[var(--color-tomato)] font-poppins",
                footerActionLink: "text-[var(--color-tomato)] hover:text-[var(--color-coral)] font-poppins",
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
            afterSignUpUrl="/dashboard"
            signInUrl="/sign-in"
          />
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--color-deep-blue)]">
            Only authorized college domains are allowed
          </p>
          <p className="text-xs text-[var(--color-coral)] mt-2">
            Example: saravanaiyyappan.s@vitstudent.ac.in
          </p>
        </div>
      </div>
    </div>
  );
} 