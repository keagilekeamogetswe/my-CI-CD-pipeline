"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useState,
  useEffect,
  useRef,
  FormEvent,
  ChangeEvent,
  KeyboardEvent,
  ClipboardEvent,
} from "react";
import { VerificationPayloadStore } from "../../state-management/payload.persistence";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneNumber = searchParams.get("phone");
  const maskedPhoneNumber = phoneNumber ?? "your phone number";

  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hasAlertedRef = useRef<boolean>(false);

  useEffect(() => {
    if (hasAlertedRef.current) return;
    const payload = VerificationPayloadStore.getPayload();
    if (!payload) {
      hasAlertedRef.current = true;
      window.alert(
        "Unable to proceed with this action. Starting over the process.",
      );
      router.push("/start");
    }
  }, [router]);

  // Calculate remaining seconds based on 'expires_at' URL search parameter
  useEffect(() => {
    const expiresAtParam = searchParams.get("expires_at");
    if (!expiresAtParam) {
      // Default fallback if query param isn't present
      setTimeLeft(0);
      return;
    }

    const expiresAt = parseInt(expiresAtParam, 10);

    const updateTimer = () => {
      const now = Date.now();
      const diffInSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(diffInSeconds);
    };

    // Immediate initial call
    updateTimer();

    // Recalculate remaining time every second against absolute epoch target
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [searchParams]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Handle individual digit input
  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    if (!val) return;

    const newCode = [...code];
    newCode[index] = val.slice(-1);
    setCode(newCode);

    if (error) setError("");

    if (index < 5 && val) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Backspace navigation
  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else {
        const newCode = [...code];
        newCode[index] = "";
        setCode(newCode);
      }
    }
  };

  // Handle Pasting complete OTP code
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .trim()
      .replace(/[^0-9]/g, "")
      .slice(0, 6);
    if (!pastedData) return;

    const newCode = [...code];
    pastedData.split("").forEach((char, i) => {
      newCode[i] = char;
    });
    setCode(newCode);
    if (error) setError("");

    const nextIdx = Math.min(pastedData.length, 5);
    inputRefs.current[nextIdx]?.focus();
  };

  // Resend Code Logic
  const handleResend = async () => {
    if (isResending || isConfirming || isConfirmed) return;
    setIsResending(true);
    setError("");

    try {
      setCode(Array(6).fill(""));
      inputRefs.current[0]?.focus();

      const payload = VerificationPayloadStore.getPayload();
      const request = await fetch("/api/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const response = await request.json();

      if (!request.ok) {
        console.log("Resend response:", response.message);
        setError(response.message || "Failed to resend code.");
        return;
      }

      const { verification_token } = response;

      // Compute 2 minutes ttl from now
      const expiryTimestamp = Date.now() + 60 * 2 * 1000;

      const params = new URLSearchParams(window.location.search);
      if (verification_token) {
        params.set("token", verification_token);
      }
      params.set("expires_at", expiryTimestamp.toString());

      const newUrl = `${window.location.pathname}?${params.toString()}`;

      // Update browser history and sync Next.js router
      window.history.replaceState(null, "", newUrl);
      router.replace(newUrl, { scroll: false });
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred while resending code.");
    } finally {
      setIsResending(false);
    }
  };

  // Form Submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isConfirming || isResending || isConfirmed) return;

    const fullCode = code.join("");

    if (fullCode.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    if (timeLeft <= 0) {
      setError("This code has expired. Please request a new code.");
      return;
    }

    setIsConfirming(true);
    setError("");

    try {
      const request = await fetch("/api/start/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: fullCode,
          verification_token: searchParams.get("token"),
        }),
      });
      const response = await request.json();
      if (!request.ok) {
        setError(response.message || "Verification failed. Please try again.");
        return;
      }

      setIsConfirmed(true);
      VerificationPayloadStore.clear();
      router.push("/");
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred during verification.");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="p-8 md:p-10 border border-gray-200 bg-white shadow-sm rounded-2xl max-w-md mx-auto text-gray-900">
      <style>{`
        @keyframes drawCheck {
          0% {
            stroke-dashoffset: 24;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight mb-2">
          Verify Your Number
        </h1>

        <p className="text-sm text-gray-600 leading-relaxed">
          Sorry for the extra step! We’ve already sent a 6-digit code to{" "}
          <strong className="font-semibold text-gray-900">
            {maskedPhoneNumber}
          </strong>
          . It will expire in{" "}
          <span className="font-semibold text-neutral-700 bg-neutral-50-50 px-1.5 py-0.5 rounded inline-block">
            {formatTime(timeLeft)}
          </span>
          .
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 6-Digit OTP Input Box Group */}
        <div>
          <div className="flex justify-between gap-2">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                disabled={isConfirming || isResending || isConfirmed}
                onChange={(e) => handleChange(index, e)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className={`w-12 h-13 text-center text-lg font-semibold border ${
                  error
                    ? "border-red-500 ring-1 ring-red-500"
                    : "border-gray-300 focus:border-black focus:ring-1 focus:ring-black"
                } rounded-lg bg-white focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                required
              />
            ))}
          </div>

          {/* Validation / Error Message */}
          {error && (
            <p className="text-red-500 text-xs mt-2 font-medium pl-1">
              {error}
            </p>
          )}
        </div>

        {/* Resend Code Section */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
          <span>Didn't receive the code?</span>
          {isConfirmed ? (
            <span className="text-green-600 font-medium">Code verified</span>
          ) : isResending ? (
            <span className="text-gray-400 font-medium">Resending code...</span>
          ) : timeLeft > 0 ? (
            <span className="text-gray-400 font-medium">
              Resend in {formatTime(timeLeft)}
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isConfirming || isResending || isConfirmed}
              className="font-bold text-black hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
            >
              Resend code
            </button>
          )}
        </div>

        {/* Action Buttons Stack */}
        <div className="space-y-2.5 pt-2">
          <button
            type="submit"
            disabled={isConfirming || isResending || isConfirmed}
            className={`w-full ${
              isConfirmed
                ? "bg-green-600 text-white cursor-default"
                : "bg-black hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed text-white cursor-pointer"
            } font-medium text-sm py-3 rounded-lg transition-colors flex items-center justify-center gap-2`}
          >
            {isConfirming && (
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                ></path>
              </svg>
            )}
            {isConfirmed && (
              <svg
                className="h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline
                  points="4 12 9 17 20 6"
                  style={{
                    strokeDasharray: 24,
                    strokeDashoffset: 24,
                    animation: "drawCheck 0.5s ease-out forwards",
                  }}
                />
              </svg>
            )}
            {isConfirmed
              ? "Verified"
              : isConfirming
                ? "Confirming Code..."
                : "Confirm Code"}
          </button>

          <Link
            href="/start"
            className={`block w-full text-center border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium text-sm py-2.5 rounded-lg transition-colors ${
              isConfirming || isResending
                ? "pointer-events-none opacity-50"
                : ""
            }`}
          >
            Change Phone Number
          </Link>
        </div>
      </form>
    </div>
  );
}
