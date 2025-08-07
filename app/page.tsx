'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User } from '@supabase/auth-helpers-nextjs';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setIsLoading(false);
    };
    getUser();

    // Create floating particles
    createParticles();
  }, [supabase]);

  const createParticles = () => {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;

    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        background: rgba(255, 215, 0, 0.6);
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        animation: floatUp ${Math.random() * 8 + 8}s infinite linear;
        animation-delay: ${Math.random() * 8}s;
      `;

      if (i % 2 === 0) {
        particle.style.background = 'rgba(255, 255, 255, 0.4)';
        particle.style.animationDuration = '12s';
      }

      particlesContainer.appendChild(particle);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white overflow-hidden relative">
      {/* Floating Particles */}
      <div id="particles" className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"></div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <nav className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent animate-pulse">
            ⚡ Zeus
          </div>
          <div className="flex items-center gap-6">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="px-6 py-2 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-all duration-300"
                >
                  Dashboard
                </Link>
                <div className="text-sm opacity-75">Welcome, {user.email}</div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-6 py-2 text-white hover:text-yellow-400 transition-colors duration-300"
                >
                  Login
                </Link>
                <Link
                  href="/sign-up"
                  className="px-6 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black rounded-full font-semibold hover:shadow-lg hover:shadow-yellow-400/25 transition-all duration-300"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center">
          {/* Lightning Animation */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-1/4 w-0.5 h-48 bg-gradient-to-b from-transparent via-yellow-400 to-transparent opacity-0 animate-[lightning_4s_infinite]"></div>
            <div className="absolute top-32 right-1/3 w-0.5 h-48 bg-gradient-to-b from-transparent via-yellow-400 to-transparent opacity-0 animate-[lightning_4s_infinite_1.5s]"></div>
            <div className="absolute top-16 right-1/4 w-0.5 h-48 bg-gradient-to-b from-transparent via-yellow-400 to-transparent opacity-0 animate-[lightning_4s_infinite_3s]"></div>
          </div>

          <h1 className="text-6xl md:text-8xl font-bold mb-6 animate-[slideInUp_1s_ease-out]">
            Command Your
            <span className="block bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              Attribution
            </span>
          </h1>

          <p className="text-2xl md:text-3xl mb-8 opacity-90 animate-[slideInUp_1s_ease-out_0.2s_both]">
            Offline Conversion Tracking for Meta & Google Ads
          </p>

          <p className="text-lg md:text-xl max-w-4xl mx-auto mb-12 leading-relaxed opacity-80 animate-[slideInUp_1s_ease-out_0.4s_both]">
            Zeus connects your offline sales data to your digital advertising campaigns.
            Upload customer data, match it to ad clicks, and send conversion events back to
            Meta and Google for complete ROAS visibility and optimized ad targeting.
          </p>

          {user ? (
            <Link
              href="/dashboard"
              className="inline-block px-12 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xl font-bold rounded-full hover:shadow-2xl hover:shadow-yellow-400/30 transition-all duration-300 hover:-translate-y-1 animate-[slideInUp_1s_ease-out_0.6s_both] relative overflow-hidden group"
            >
              <span className="relative z-10">Go to Dashboard</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
            </Link>
          ) : (
            <Link
              href="/signup"
              className="inline-block px-12 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xl font-bold rounded-full hover:shadow-2xl hover:shadow-yellow-400/30 transition-all duration-300 hover:-translate-y-1 animate-[slideInUp_1s_ease-out_0.6s_both] relative overflow-hidden group"
            >
              <span className="relative z-10">Get Started</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
            </Link>
          )}
        </div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 py-20 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 animate-[fadeInUp_1s_ease-out]">
            Powerful Attribution Features
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "📊",
                title: "CSV Upload & Processing",
                description: "Upload customer data files and automatically match them to ad clicks using advanced algorithms and PII hashing."
              },
              {
                icon: "🎯",
                title: "Meta Conversions API",
                description: "Send offline conversion events directly to Meta's Conversions API for improved ad optimization and attribution."
              },
              {
                icon: "🔍",
                title: "Google Ads Integration",
                description: "Upload enhanced conversions to Google Ads with customer data matching for better conversion tracking."
              },
              {
                icon: "⚡",
                title: "Real-time Sync",
                description: "Instantly sync conversion data to advertising platforms with real-time status updates and error handling."
              },
              {
                icon: "📈",
                title: "Attribution Reports",
                description: "View detailed reports on conversion matching rates, sync status, and attribution performance across platforms."
              },
              {
                icon: "🔒",
                title: "Secure & Compliant",
                description: "Enterprise-grade security with PII hashing, encrypted data transmission, and GDPR compliance features."
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl border border-white/20 animate-[fadeInUp_1s_ease-out] group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-yellow-400">
                  {feature.title}
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative z-10 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            How Zeus Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Upload Data",
                description: "Upload CSV files with customer purchase data including emails, phones, and transaction details."
              },
              {
                step: "2",
                title: "Match & Process",
                description: "Zeus matches your customer data to ad clicks using advanced algorithms and secure PII hashing."
              },
              {
                step: "3",
                title: "Send Conversions",
                description: "Conversion events are sent to Meta and Google Ads platforms via their respective APIs."
              },
              {
                step: "4",
                title: "Track Results",
                description: "Monitor attribution performance and optimize your ad campaigns with complete offline visibility."
              }
            ].map((step, index) => (
              <div key={index} className="text-center group">
                <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-3xl font-bold text-black mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold mb-4 text-yellow-400">
                  {step.title}
                </h3>
                <p className="text-gray-300">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="relative z-10 py-20 text-center">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-4xl md:text-5xl font-bold mb-8">
              Ready to Master Your Attribution?
            </h2>
            <p className="text-xl mb-12 opacity-80">
              Join the revolution in offline conversion tracking and unlock the true power of your advertising data.
            </p>
            <Link
              href="/signup"
              className="inline-block px-12 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xl font-bold rounded-full hover:shadow-2xl hover:shadow-yellow-400/30 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group"
            >
              <span className="relative z-10">Start Tracking Now</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
            </Link>
          </div>
        </section>
      )}

      <style jsx global>{`
        @keyframes floatUp {
          0% {
            opacity: 0;
            transform: translateY(100vh) rotate(0deg);
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(-100px) rotate(360deg);
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes lightning {
          0%, 90%, 100% { 
            opacity: 0; 
            transform: translateY(-100px); 
          }
          5%, 85% { 
            opacity: 1; 
            transform: translateY(100vh); 
          }
        }
      `}</style>
    </div>
  );
}