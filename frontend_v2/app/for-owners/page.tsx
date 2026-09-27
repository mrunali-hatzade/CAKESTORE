"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Store, TrendingUp, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";

export default function ForOwnersPage() {
  const perks = [
    "Your own custom branded online bakery storefront",
    "Digital menu builder with real-time stock and prices",
    "Automated kitchen order alerts and delivery slot control",
    "Direct online customer payments via UPI and Cards",
    "Verified local bakery badge to boost trust",
    "Zero technical experience needed, live in 10 minutes",
  ];

  const benefits = [
    {
      icon: Store,
      title: "Your Own Storefront",
      description:
        "Get a beautiful branded bakery website on CakeStore. Share one link on Instagram and WhatsApp and let the orders come to you.",
    },
    {
      icon: TrendingUp,
      title: "0% Commission. Always.",
      description:
        "Unlike delivery apps that cut 20-30% per order, CakeStore charges a flat subscription. Every rupee your customer pays goes to your bank.",
    },
    {
      icon: ShieldCheck,
      title: "Kitchen Order Management",
      description:
        "Receive structured order sheets replacing scattered WhatsApp messages. Track every order from confirmation to delivery in one dashboard.",
    },
  ];

  return (
    <div className="min-h-screen bg-brand-cream-light font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center max-w-4xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-blush border border-brand-blush-border text-brand-plum text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>CakeStore Baker Partner Program</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif text-brand-espresso tracking-tight">
            Take Your Cake Business{" "}
            <span className="text-brand-plum italic">Online Today</span>
          </h1>
          <p className="text-base sm:text-lg text-brand-muted max-w-2xl mx-auto leading-relaxed">
            Whether you bake from home or run a boutique cake studio, CakeStore
            gives you all the tools to accept orders, manage your kitchen, and
            delight customers.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/onboarding"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-brand-plum hover:bg-brand-plum-hover text-white text-base font-bold shadow-sm transition-all active:scale-95"
            >
              <span>Register Your Bakery</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-white border border-brand-border text-brand-espresso text-base font-semibold hover:bg-brand-cream transition-colors"
            >
              View Pricing and Plans
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {benefits.map((b, i) => {
            const Icon = b.icon;
            return (
              <div
                key={i}
                className="bg-white rounded-3xl p-7 border border-brand-border shadow-sm hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-brand-blush flex items-center justify-center text-brand-plum mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold font-serif text-brand-espresso mb-2">
                  {b.title}
                </h3>
                <p className="text-sm text-brand-muted leading-relaxed">
                  {b.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-3xl border border-brand-border shadow-sm p-8 sm:p-12 mb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-brand-espresso">
              Everything You Need to{" "}
              <span className="text-brand-plum italic">Succeed</span>
            </h2>
            <p className="text-sm text-brand-muted mt-2">
              All features included in every plan. No hidden extras.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {perks.map((perk, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <span className="text-sm text-brand-espresso font-medium">
                  {perk}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-brand-plum to-brand-plum-dark rounded-3xl p-8 sm:p-12 text-center text-white">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif mb-3">
            Join 500+ Home Bakers Already on CakeStore
          </h2>
          <p className="text-sm text-white/70 max-w-xl mx-auto mb-8">
            Simple, transparent pricing. Our team helps you set up your
            storefront and go live in under 10 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-white text-brand-plum text-sm font-bold shadow-sm hover:bg-brand-cream transition-all active:scale-95"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center px-8 py-4 rounded-2xl border border-white/30 text-white text-sm font-semibold hover:bg-white/10 transition-all"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
