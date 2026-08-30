"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

interface ProfileStartProps {
  phoneNumber: string;
  onEdit?: () => void;
  initialData?: {
    firstName: string;
    lastName: string;
    dob: string;
  };
  loading?: boolean;
  error?: string;
  onSubmit?: (payload: {
    firstName: string;
    lastName: string;
    dob: string;
  }) => Promise<void> | void;
}

export default function ProfileStart({
  phoneNumber,
  onEdit,
  initialData,
  loading = false,
  error = "",
  onSubmit,
}: ProfileStartProps) {
  const [firstName, setFirstName] = useState(initialData?.firstName ?? "");
  const [lastName, setLastName] = useState(initialData?.lastName ?? "");
  const [dob, setDob] = useState(initialData?.dob ?? "");

  useEffect(() => {
    setFirstName(initialData?.firstName ?? "");
    setLastName(initialData?.lastName ?? "");
    setDob(initialData?.dob ?? "");
  }, [initialData]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void onSubmit?.({ firstName, lastName, dob });
  };

  return (
    <div className="p-8 md:p-10 border border-gray-200 bg-white shadow-sm rounded-2xl max-w-md mx-auto text-gray-900">
      {/* Header Section with Inline Paragraph Notice */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight mb-1.5">
          Create an Account
        </h1>
        <p className="text-sm text-gray-600 leading-relaxed">
          A verification code will be sent to{" "}
          <strong className="font-semibold text-gray-900">
            {phoneNumber || "+1 (555) 000-0000"}
          </strong>
          .{" "}
          <button
            type="button"
            onClick={onEdit}
            className="font-bold text-black hover:underline cursor-pointer inline-block"
          >
            Change phone number
          </button>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
        {/* Anti-autofill trap */}
        <input
          type="text"
          name="fake_username"
          tabIndex={-1}
          className="hidden"
          aria-hidden="true"
        />
        <input
          type="password"
          name="fake_password"
          tabIndex={-1}
          className="hidden"
          aria-hidden="true"
        />

        {/* First & Last Name Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative border border-gray-300 rounded-lg focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all">
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="peer block px-3.5 pb-2 pt-5 w-full text-sm bg-transparent border-0 appearance-none focus:outline-none focus:ring-0"
              placeholder=" "
              autoComplete="given-name"
              required
            />
            <label
              htmlFor="firstName"
              className="absolute text-sm text-gray-500 duration-200 transform -translate-y-3 scale-75 top-3.5 left-3.5 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-black pointer-events-none"
            >
              First Name
            </label>
          </div>

          <div className="relative border border-gray-300 rounded-lg focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all">
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="peer block px-3.5 pb-2 pt-5 w-full text-sm bg-transparent border-0 appearance-none focus:outline-none focus:ring-0"
              placeholder=" "
              autoComplete="family-name"
              required
            />
            <label
              htmlFor="lastName"
              className="absolute text-sm text-gray-500 duration-200 transform -translate-y-3 scale-75 top-3.5 left-3.5 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-black pointer-events-none"
            >
              Last Name
            </label>
          </div>
        </div>

        {/* Floating Date of Birth Field */}
        <div className="relative border border-gray-300 rounded-lg focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all">
          <input
            type="date"
            id="dob"
            name="dob"
            value={dob}
            onChange={(event) => setDob(event.target.value)}
            className="peer block px-3.5 pb-2 pt-5 w-full text-sm bg-transparent border-0 appearance-none focus:outline-none focus:ring-0"
            placeholder=" "
            required
          />
          <label
            htmlFor="dob"
            className="absolute text-sm text-gray-500 duration-200 transform -translate-y-3 scale-75 top-3.5 left-3.5 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-black pointer-events-none"
          >
            Date of Birth
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black hover:bg-neutral-800 text-white font-medium text-sm py-3 rounded-lg transition-colors cursor-pointer mt-2"
        >
          {loading ? "Sending Code..." : "Continue to Verification"}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>

      <div className="flex items-center my-6">
        <hr className="flex-grow border-gray-200" />
        <span className="px-3 text-gray-400 text-xs uppercase tracking-wider font-medium">
          or
        </span>
        <hr className="flex-grow border-gray-200" />
      </div>

      <p className="text-sm text-center text-gray-600">
        Already have an account?{" "}
        <Link
          href="/recovery"
          className="text-black font-semibold hover:underline"
        >
          Sign In
        </Link>
      </p>
    </div>
  );
}
