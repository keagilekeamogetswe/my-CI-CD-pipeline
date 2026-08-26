"use client";
import Link from "next/link";
import { FormEvent } from "react";

export default function RecoveryPage() {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Handle recovery submission logic
  };

  return (
    <div className="p-8 md:p-10 border border-gray-200 bg-white shadow-sm rounded-2xl max-w-md mx-auto text-gray-900">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight mb-1.5">
          Swift Recovery Service
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Restore access to your account using your registered recovery email
          and password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
        {/* Recovery Email Field */}
        <div className="relative border border-gray-300 rounded-lg focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all">
          <input
            type="email"
            id="email"
            name="email"
            className="peer block px-3.5 pb-2 pt-5 w-full text-sm bg-transparent border-0 appearance-none focus:outline-none focus:ring-0"
            placeholder=" "
            autoComplete="email"
            required
          />
          <label
            htmlFor="email"
            className="absolute text-sm text-gray-500 duration-200 transform -translate-y-3 scale-75 top-3.5 left-3.5 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-black pointer-events-none"
          >
            Registered Recovery Email
          </label>
        </div>

        {/* Account Password Field */}
        <div className="relative border border-gray-300 rounded-lg focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all">
          <input
            type="password"
            id="password"
            name="password"
            className="peer block px-3.5 pb-2 pt-5 w-full text-sm bg-transparent border-0 appearance-none focus:outline-none focus:ring-0"
            placeholder=" "
            autoComplete="current-password"
            required
          />
          <label
            htmlFor="password"
            className="absolute text-sm text-gray-500 duration-200 transform -translate-y-3 scale-75 top-3.5 left-3.5 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-black pointer-events-none"
          >
            Account Password
          </label>
        </div>

        <div className="flex justify-end pt-0.5">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-gray-600 hover:text-black hover:underline transition-colors"
          >
            Forgot Password?
          </Link>
        </div>

        {/* Action Stack */}
        <div className="space-y-2.5 pt-2">
          <button
            type="submit"
            className="w-full bg-black hover:bg-neutral-800 text-white font-medium text-sm py-3 rounded-lg transition-colors cursor-pointer"
          >
            Continue
          </button>
          <Link
            href="/start"
            className="block w-full text-center border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium text-sm py-2.5 rounded-lg transition-colors"
          >
            Back to phone
          </Link>
        </div>
      </form>
    </div>
  );
}
