"use client";
import { Button } from "@/components/ui/button";
import Aurora from "@/components/Aurora/Aurora";
import { 
  CreditCard, 
  Smartphone, 
  Clock, 
  Shield, 
  Users, 
  Zap,
  ArrowRight,
  Play,
  HomeIcon,
  BookIcon,
  InfoIcon,
  MailIcon,

} from "lucide-react";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { useRouter } from "next/navigation";


export default function Home() {
  const router = useRouter();
  const navItems = [
    { name: "Home", link: "/", icon: <HomeIcon /> },
    { name: "Book", link: "/book", icon: <BookIcon /> },
    { name: "About", link: "/about", icon: <InfoIcon /> },
    { name: "Contact", link: "/contact", icon: <MailIcon /> },
  ];
  return (
    <div className="min-h-screen font-outfit bg-gradient-to-br from-[var(--color-beige)] via-[var(--color-mint)] to-[var(--color-yellow)]">
       
      {/* Hero Section with Lightning Background */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
        
        <Aurora
  colorStops={["#FF4B3E", "#FFD23F", "#B2F7EF"]}
  blend={0.5}
  amplitude={1.0}
  speed={2}
/>
        </div>
        <FloatingNav navItems={navItems} />
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-tomato)]/60 via-[var(--color-coral)]/40 to-[var(--color-yellow)]/30 z-10 mix-blend-multiply" />
        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white drop-shadow-lg">
            Welcome to <span className="text-[var(--color-yellow)] font-poppins drop-shadow-[0_2px_8px_rgba(255,75,62,0.5)]">WeDine🍜</span>
          </h1>
          <p className="text-xl md:text-2xl text-[var(--color-mint)] mb-8 max-w-2xl mx-auto font-poppins drop-shadow">
            Smart campus dining with <span className="text-[var(--color-yellow)] font-bold">real-time payments</span>, <span className="text-[var(--color-coral)] font-bold">RFID pickup</span>, and a <span className="text-[var(--color-tomato)] font-bold">seamless experience</span>.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button onClick={() => router.push("/book")} className="cursor-pointer bg-[var(--color-yellow)] hover:bg-[var(--color-tomato)] text-[var(--color-deep-blue)] font-bold px-8 py-4 text-lg rounded-full shadow-lg transition-all duration-200">
   Book Food
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" className="border-2 border-[var(--color-coral)] text-[var(--color-coral)] hover:bg-[var(--color-coral)] hover:text-white px-8 py-4 text-lg rounded-full font-bold shadow-lg transition-all duration-200">
              <Play className="mr-2 h-5 w-5" />
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-[var(--color-yellow)] via-[var(--color-beige)] to-[var(--color-mint)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 ">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[var(--color-tomato)] drop-shadow">
              Why Choose <span className="text-[var(--color-coral)]">WeDine</span>?
            </h2>
            <p className="text-xl text-[var(--color-deep-blue)] max-w-3xl mx-auto font-poppins">
              Experience the future of campus dining with our playful, vibrant features for students and restaurant owners.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature Cards */}
            <div className="bg-white/80 p-8 rounded-2xl hover:shadow-2xl border-2 border-[var(--color-tomato)] transition-all duration-300">
              <div className="bg-[var(--color-tomato)]/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <Smartphone className="h-8 w-8 text-[var(--color-tomato)]" />
              </div>
              <h3 className="text-2xl font-bold text-[var(--color-tomato)] mb-4">Real-Time Ordering</h3>
              <p className="text-[var(--color-deep-blue)]">Browse menus from 5 campus restaurants and place orders instantly with live updates.</p>
            </div>

            <div className="bg-white/80 p-8 rounded-2xl hover:shadow-2xl border-2 border-[var(--color-yellow)] transition-all duration-300">
              <div className="bg-[var(--color-yellow)]/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <CreditCard className="h-8 w-8 text-[var(--color-yellow)]" />
              </div>
              <h3 className="text-2xl font-bold text-[var(--color-yellow)] mb-4">Smart E-Wallet</h3>
              <p className="text-[var(--color-deep-blue)]">In-app wallet with instant balance deduction and secure payment processing.</p>
            </div>

            <div className="bg-white/80 p-8 rounded-2xl hover:shadow-2xl border-2 border-[var(--color-coral)] transition-all duration-300">
              <div className="bg-[var(--color-coral)]/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <Shield className="h-8 w-8 text-[var(--color-coral)]" />
              </div>
              <h3 className="text-2xl font-bold text-[var(--color-coral)] mb-4">RFID Verification</h3>
              <p className="text-[var(--color-deep-blue)]">Secure pickup verification using college ID cards and RFID technology.</p>
            </div>

            <div className="bg-white/80 p-8 rounded-2xl hover:shadow-2xl border-2 border-[var(--color-mint)] transition-all duration-300">
              <div className="bg-[var(--color-mint)]/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <Clock className="h-8 w-8 text-[var(--color-mint)]" />
              </div>
              <h3 className="text-2xl font-bold text-[var(--color-mint)] mb-4">Live Tracking</h3>
              <p className="text-[var(--color-deep-blue)]">Track your order from preparation to pickup with real-time status updates.</p>
            </div>

            <div className="bg-white/80 p-8 rounded-2xl hover:shadow-2xl border-2 border-[var(--color-deep-blue)] transition-all duration-300">
              <div className="bg-[var(--color-deep-blue)]/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <Zap className="h-8 w-8 text-[var(--color-deep-blue)]" />
              </div>
              <h3 className="text-2xl font-bold text-[var(--color-deep-blue)] mb-4">Instant Notifications</h3>
              <p className="text-[var(--color-tomato)]">Get push notifications for payments, order status, and pickup readiness.</p>
            </div>

            <div className="bg-white/80 p-8 rounded-2xl hover:shadow-2xl border-2 border-[var(--color-mint)] transition-all duration-300">
              <div className="bg-[var(--color-mint)]/10 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <Users className="h-8 w-8 text-[var(--color-mint)]" />
              </div>
              <h3 className="text-2xl font-bold text-[var(--color-mint)] mb-4">Restaurant Dashboard</h3>
              <p className="text-[var(--color-tomato)]">Manage menus, view orders, and track sales with our comprehensive dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-[var(--color-mint)] via-[var(--color-yellow)] to-[var(--color-beige)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-[var(--color-coral)] drop-shadow">
              How <span className="text-[var(--color-tomato)]">WeDine</span> Works
            </h2>
            <p className="text-xl text-[var(--color-deep-blue)] max-w-3xl mx-auto font-poppins">
              Simple steps to enjoy a seamless, colorful campus dining experience
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-[var(--color-tomato)] text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">
                1
              </div>
              <h3 className="text-xl font-bold text-[var(--color-tomato)] mb-4">Browse & Order</h3>
              <p className="text-[var(--color-deep-blue)]">Select from 5 campus restaurants and add items to your cart</p>
            </div>

            <div className="text-center">
              <div className="bg-[var(--color-yellow)] text-[var(--color-deep-blue)] w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">
                2
              </div>
              <h3 className="text-xl font-bold text-[var(--color-yellow)] mb-4">Pay Securely</h3>
              <p className="text-[var(--color-deep-blue)]">Scan your college ID card and pay instantly from your e-wallet</p>
            </div>

            <div className="text-center">
              <div className="bg-[var(--color-coral)] text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">
                3
              </div>
              <h3 className="text-xl font-bold text-[var(--color-coral)] mb-4">Track Order</h3>
              <p className="text-[var(--color-deep-blue)]">Monitor your order status in real-time with live updates</p>
            </div>

            <div className="text-center">
              <div className="bg-[var(--color-mint)] text-[var(--color-tomato)] w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg">
                4
              </div>
              <h3 className="text-xl font-bold text-[var(--color-mint)] mb-4">Pick Up</h3>
              <p className="text-[var(--color-deep-blue)]">Scan your ID at the restaurant for instant pickup verification</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-[var(--color-tomato)] via-[var(--color-yellow)] to-[var(--color-coral)] text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2 drop-shadow">5</div>
              <div className="text-lg font-poppins">Campus Restaurants</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2 drop-shadow">1000+</div>
              <div className="text-lg font-poppins">Happy Students</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2 drop-shadow">24/7</div>
              <div className="text-lg font-poppins">Order Support</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2 drop-shadow">99%</div>
              <div className="text-lg font-poppins">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-[var(--color-yellow)] via-[var(--color-coral)] to-[var(--color-tomato)] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 drop-shadow">
            Ready to Transform Your Campus Dining?
          </h2>
          <p className="text-xl mb-8 text-[var(--color-mint)] font-poppins">
            Join thousands of students who are already enjoying the future of smart campus dining.
          </p>
          <Button className="bg-[var(--color-yellow)] hover:bg-[var(--color-tomato)] text-[var(--color-deep-blue)] font-bold px-8 py-4 text-lg rounded-full shadow-lg transition-all duration-200">
            Download WeDine App
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--color-deep-blue)] text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold text-[var(--color-yellow)] mb-4">WeDine</h3>
              <p className="text-[var(--color-mint)]">
                Smart campus dining made simple and secure.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-[var(--color-yellow)]">Features</h4>
              <ul className="space-y-2 text-[var(--color-mint)]">
                <li>Real-time Ordering</li>
                <li>E-Wallet Payments</li>
                <li>RFID Verification</li>
                <li>Live Tracking</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-[var(--color-yellow)]">Support</h4>
              <ul className="space-y-2 text-[var(--color-mint)]">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>FAQ</li>
                <li>Feedback</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-[var(--color-yellow)]">Legal</h4>
              <ul className="space-y-2 text-[var(--color-mint)]">
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Cookie Policy</li>
                <li>Security</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[var(--color-mint)] mt-8 pt-8 text-center text-[var(--color-mint)]">
            <p>&copy; 2024 WeDine. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
