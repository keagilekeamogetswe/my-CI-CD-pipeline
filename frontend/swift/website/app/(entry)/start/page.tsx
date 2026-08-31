"use client";
import Link from "next/link";
import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import ProfileStart from "./profile.data";
import VerifyPage from "./verify/page";
import ProfileCustomization from "./profile.customization";
import SwiftRecovery, { SwiftRecoveryPayload } from "./swift.recovery";
import RecoveryPage from "../recovery/page";
import {
  buildDeviceHeaders,
  collectDeviceContext,
  DeviceContext,
} from "../../lib/device-context";

function maskValue(value: string) {
  if (!value) {
    return "";
  }

  if (value.includes("@")) {
    const [name, domain] = value.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }

  return value.length <= 4 ? "****" : `${"*".repeat(value.length - 4)}${value.slice(-4)}`;
}

const COUNTRY_DATA = [
  { name: "United States", code: "+1", flag: "🇺🇸" },
  { name: "South Africa", code: "+27", flag: "🇿🇦" },
  { name: "United Kingdom", code: "+44", flag: "🇬🇧" },
  { name: "India", code: "+91", flag: "🇮🇳" },
  { name: "Australia", code: "+61", flag: "🇦🇺" },
  { name: "Germany", code: "+49", flag: "🇩🇪" },
  { name: "France", code: "+33", flag: "🇫🇷" },
];

export default function StartPage() {
  const router = useRouter();
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_DATA[0].name);
  const [dialCode, setDialCode] = useState(COUNTRY_DATA[0].code);
  const [phone_body, setPhoneBody] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<
    "phone" | "profile" | "verify" | "customize" | "recovery" | "recover"
  >("phone");
  const [loading, setLoading] = useState(false);
  const [deviceContext, setDeviceContext] = useState<DeviceContext | null>(null);
  const [verificationToken, setVerificationToken] = useState("");
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    dob: "",
  });
  const [customization, setCustomization] = useState({
    bio: "",
    profilePictureUrl: "",
  });
  const [swiftRecovery, setSwiftRecovery] = useState<SwiftRecoveryPayload>({
    optedIn: false,
    recoveryMethod: "email",
    recoveryValue: "",
    backupUsedMb: 0,
    plan: "free",
    allowSyncedAuth: false,
    syncedPhoneNumber: "",
  });

  useEffect(() => {
    void collectDeviceContext().then(setDeviceContext);
  }, []);

  const handleCountryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const countryName = e.target.value;
    setSelectedCountry(countryName);
    const matched = COUNTRY_DATA.find((c) => c.name === countryName);
    if (matched) setDialCode(matched.code);
  };

  const handleNext = (e: FormEvent) => {
    e.preventDefault();

    if (!phone_body.trim()) {
      setError("Please enter a valid phone number to continue.");
      return;
    }

    setError("");
    setCurrentStep("profile");
  };

  const handleProfileSubmit = async (payload: {
    firstName: string;
    lastName: string;
    dob: string;
  }) => {
    if (!deviceContext) {
      setError("Preparing secure device context. Please try again.");
      return;
    }

    setLoading(true);
    setError("");
    setProfileData(payload);

    try {
      const response = await fetch("/api/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildDeviceHeaders(deviceContext),
        },
        body: JSON.stringify({
          name: payload.firstName,
          lastname: payload.lastName,
          dob: payload.dob,
          phone: {
            code: dialCode,
            body: phone_body.replace(/\D/g, ""),
            dial_code_id: 27,
          },
          device_info: deviceContext.deviceInfo,
          fp_hash: deviceContext.webglFingerprint,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to start account verification.");
      }

      setVerificationToken(result.verification_token);
      setCurrentStep("verify");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to start account verification.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSuccess = async (code: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/start/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verification_token: verificationToken,
          code,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Verification failed.");
      }

      setCurrentStep("customize");
    } catch (verifyError) {
      setError(
        verifyError instanceof Error ? verifyError.message : "Verification failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const finishOnboarding = async (payload: SwiftRecoveryPayload) => {
    setLoading(true);
    setSwiftRecovery(payload);
    const retentionLabel = payload.optedIn
      ? "Swift Recovery active with linked backup credentials."
      : "Passwordless session retained for 45 days unless your number is claimed, then 7 days.";

    window.localStorage.setItem(
      "swift-session",
      JSON.stringify({
        phoneNumber: `${dialCode} ${phone_body}`,
        profile: profileData,
        customization,
        recovery: {
          optedIn: payload.optedIn,
          recoveryMethod: payload.recoveryMethod,
          allowSyncedAuth: payload.allowSyncedAuth,
          syncedPhoneNumberMasked: maskValue(payload.syncedPhoneNumber),
          recoveryValueMasked: maskValue(payload.recoveryValue),
        },
        retentionLabel,
        onboardingCompletedAt: new Date().toISOString(),
      }),
    );
    router.push("/messages");
  };

  if (currentStep === "profile") {
    return (
      <ProfileStart
        phoneNumber={`${dialCode} ${phone_body}`}
        initialData={profileData}
        onEdit={() => setCurrentStep("phone")}
        onSubmit={handleProfileSubmit}
        loading={loading}
        error={error}
      />
    );
  }

  if (currentStep === "verify") {
    return (
      <VerifyPage
        phoneNumber={`${dialCode} ${phone_body}`}
        onBack={() => setCurrentStep("phone")}
        onSuccess={handleVerificationSuccess}
        loading={loading}
        errorMessage={error}
      />
    );
  }

  if (currentStep === "customize") {
    return (
      <ProfileCustomization
        initialData={customization}
        loading={loading}
        onSkip={() => setCurrentStep("recovery")}
        onSubmit={(payload) => {
          setCustomization(payload);
          setCurrentStep("recovery");
        }}
      />
    );
  }

  if (currentStep === "recovery") {
    return (
      <SwiftRecovery
        initialData={swiftRecovery}
        loading={loading}
        onBack={() => setCurrentStep("customize")}
        onSubmit={finishOnboarding}
      />
    );
  }

  if (currentStep === "recover") {
    return <RecoveryPage onBack={() => setCurrentStep("phone")} />;
  }

  return (
    <div className="p-8 md:p-10 border border-gray-200 bg-white shadow-sm rounded-2xl max-w-md mx-auto text-gray-900">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight mb-1.5">
          Get Started
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Enter your mobile number to receive a verification code.
        </p>
      </div>

      <form onSubmit={handleNext} className="space-y-4" autoComplete="on">
        {/* Country Selection Dropdown */}
        <div className="relative border border-gray-300 rounded-lg focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all">
          <select
            id="country"
            name="country"
            value={selectedCountry}
            onChange={handleCountryChange}
            className="peer block px-3.5 pb-2 pt-5 w-full text-sm bg-transparent border-0 appearance-none focus:outline-none focus:ring-0 cursor-pointer pr-8 text-gray-900"
            required
          >
            {COUNTRY_DATA.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.code}) {c.flag}
              </option>
            ))}
          </select>
          <label
            htmlFor="country"
            className="absolute text-sm text-gray-500 duration-200 transform -translate-y-3 scale-75 top-3.5 left-3.5 origin-[0] pointer-events-none peer-focus:text-black"
          >
            Country / Region
          </label>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {/* Combined Dial Code & Phone Field */}
        <div>
          <div
            className={`relative border ${
              error
                ? "border-red-500 ring-1 ring-red-500"
                : "border-gray-300 focus-within:border-black focus-within:ring-1 focus-within:ring-black"
            } rounded-lg flex items-center transition-all bg-white`}
          >
            {/* Dial Code Dropdown */}
            <div className="pl-3.5 pr-2 pt-2 pb-1 border-r border-gray-200 flex items-center shrink-0">
              <select
                value={dialCode}
                onChange={(e) => setDialCode(e.target.value)}
                className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer pr-1 py-1"
                aria-label="Dial Code"
              >
                {COUNTRY_DATA.map((c) => (
                  <option key={c.code + c.name} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
            </div>

            {/* Input Field */}
            <div className="relative flex-grow">
              <input
                type="tel"
                id="phone"
                name="phone"
                value={phone_body}
                onChange={(e) => {
                  setPhoneBody(e.target.value);
                  if (error) setError("");
                }}
                className="peer block px-3.5 pb-2 pt-5 w-full text-sm bg-transparent border-0 appearance-none focus:outline-none focus:ring-0 text-gray-900"
                placeholder=" "
                autoComplete="tel"
                required
              />
              <label
                htmlFor="phone"
                className="absolute text-sm text-gray-500 duration-200 transform -translate-y-3 scale-75 top-3.5 left-3.5 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-black pointer-events-none"
              >
                Phone Number
              </label>
            </div>
          </div>

          {/* Validation Error Message */}
          {error && (
            <p className="text-red-500 text-xs mt-1.5 font-medium pl-1">
              {error}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            type="submit"
            className="w-full bg-black hover:bg-neutral-800 text-white font-medium text-sm py-3 rounded-lg transition-colors cursor-pointer"
          >
            Next
          </button>
         <Link
           href="#"
           onClick={(event) => {
             event.preventDefault();
             setCurrentStep("recover");
           }}
           className="block w-full text-center border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium text-sm py-2.5 rounded-lg transition-colors"
         >
           Recover Profile
         </Link>
       </div>
     </form>
   </div>
  );
}
