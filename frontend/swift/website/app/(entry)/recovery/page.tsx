"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildDeviceHeaders,
  collectDeviceContext,
  DeviceContext,
} from "../../lib/device-context";

interface RecoveryPageProps {
  onBack?: () => void;
}

export default function RecoveryPage({ onBack }: RecoveryPageProps) {
  const router = useRouter();
  const [deviceContext, setDeviceContext] = useState<DeviceContext | null>(null);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void collectDeviceContext().then(setDeviceContext);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!deviceContext) {
      setError("Preparing secure device context. Please try again.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/account/recovery", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...buildDeviceHeaders(deviceContext),
        },
        body: JSON.stringify({
          user_id: userId,
          password,
          device_info: deviceContext.deviceInfo,
        }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Account recovery failed.");
      }

      window.localStorage.setItem(
        "swift-session",
        JSON.stringify({
          accessToken: payload.access_token,
          recoveryMode: true,
          onboardingCompletedAt: new Date().toISOString(),
        }),
      );
      setMessage(payload.message);
      router.push("/messages");
    } catch (recoveryError) {
      setError(
        recoveryError instanceof Error
          ? recoveryError.message
          : "Account recovery failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 md:p-10 border border-gray-200 bg-white shadow-sm rounded-2xl max-w-md mx-auto text-gray-900">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight mb-1.5">
          Swift Recovery Service
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Restore access using your recovery user ID and linked credential while
          preserving device-bound access token checks.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
        <div className="relative border border-gray-300 rounded-lg focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all">
          <input
            type="text"
            id="userId"
            name="userId"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            className="peer block px-3.5 pb-2 pt-5 w-full text-sm bg-transparent border-0 appearance-none focus:outline-none focus:ring-0"
            placeholder=" "
            autoComplete="username"
            required
          />
          <label
            htmlFor="userId"
            className="absolute text-sm text-gray-500 duration-200 transform -translate-y-3 scale-75 top-3.5 left-3.5 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-black pointer-events-none"
          >
            Recovery User ID
          </label>
        </div>

        <div className="relative border border-gray-300 rounded-lg focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all">
          <input
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

        <div className="flex justify-end pt-0.5">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-gray-600 hover:text-black hover:underline transition-colors"
          >
            Forgot Password?
          </Link>
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black hover:bg-neutral-800 text-white font-medium text-sm py-3 rounded-lg transition-colors cursor-pointer"
          >
            {loading ? "Recovering..." : "Continue"}
          </button>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="block w-full rounded-lg border border-gray-300 py-2.5 text-center text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50"
            >
              Back to phone
            </button>
          ) : (
            <Link
              href="/start"
              className="block w-full text-center border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium text-sm py-2.5 rounded-lg transition-colors"
            >
              Back to phone
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
