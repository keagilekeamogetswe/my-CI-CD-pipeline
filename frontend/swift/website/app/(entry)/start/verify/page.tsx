"use client";

import Link from "next/link";
import {
  useState,
  useEffect,
  useRef,
  FormEvent,
  ChangeEvent,
  KeyboardEvent,
  ClipboardEvent,
} from "react";

interface VerifyPageProps {
  phoneNumber?: string;
  onBack?: () => void;
  onSuccess?: () => void;
}

export default function VerifyPage({
  phoneNumber = "+1 (555) 000-0000",
  onBack,
  onSuccess,
}: VerifyPageProps) {
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [timeLeft, setTimeLeft] = useState<number>(120); // 2 minutes = 120 seconds
  const [error, setError] = useState<string>("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 2-Minute Countdown Timer
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Handle individual digit input
  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, ""); // allow digits only
    if (!val) return;

    const newCode = [...code];
    newCode[index] = val.slice(-1); // Take last entered digit
    setCode(newCode);

    if (error) setError("");

    // Auto-focus next input
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

    // Focus last filled digit or final input
    const nextIdx = Math.min(pastedData.length, 5);
    inputRefs.current[nextIdx]?.focus();
  };

  // Resend Code Logic
  const handleResend = () => {
    setTimeLeft(120);
    setCode(Array(6).fill(""));
    setError("");
    inputRefs.current[0]?.focus();
  };

  // Form Submission
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const fullCode = code.join("");

    if (fullCode.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    if (timeLeft <= 0) {
      setError("This code has expired. Please request a new code.");
      return;
    }

    setError("");
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="p-8 md:p-10 border border-gray-200 bg-white shadow-sm rounded-2xl max-w-md mx-auto text-gray-900">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight mb-2">
          Verify Your Number
        </h1>

        {/* Empathetic / Pity Explanation Message */}
        <p className="text-sm text-gray-600 leading-relaxed">
          Sorry for the extra step! We’ve already sent a 6-digit code to{" "}
          <strong className="font-semibold text-gray-900">{phoneNumber}</strong>
          . It will expire in{" "}
          <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 inline-block">
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
                onChange={(e) => handleChange(index, e)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className={`w-12 h-13 text-center text-lg font-semibold border ${
                  error
                    ? "border-red-500 ring-1 ring-red-500"
                    : "border-gray-300 focus:border-black focus:ring-1 focus:ring-black"
                } rounded-lg bg-white focus:outline-none transition-all`}
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
          {timeLeft > 0 ? (
            <span className="text-gray-400 font-medium">
              Resend in {formatTime(timeLeft)}
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="font-bold text-black hover:underline cursor-pointer"
            >
              Resend code
            </button>
          )}
        </div>

        {/* Action Buttons Stack */}
        <div className="space-y-2.5 pt-2">
          <button
            type="submit"
            className="w-full bg-black hover:bg-neutral-800 text-white font-medium text-sm py-3 rounded-lg transition-colors cursor-pointer"
          >
            Confirm Code
          </button>

          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="w-full text-center border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium text-sm py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Change Phone Number
            </button>
          ) : (
            <Link
              href="/start"
              className="block w-full text-center border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium text-sm py-2.5 rounded-lg transition-colors"
            >
              Change Phone Number
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
