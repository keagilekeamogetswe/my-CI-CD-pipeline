"use client";

import { useEffect, useState } from "react";
import { AccessTokenDeamon } from "@/providers/access-token.deamon";
import SettingsLoading from "./settings.loading";

export interface SettingsConfig {
  privacy: {
    lastseen: "everyone" | "contacts" | "nobody";
    online: "everyone" | "contacts" | "same_as_last_seen" | "nobody";
    profile_picture: "everyone" | "contacts" | "nobody";
    about: "everyone" | "contacts" | "nobody";
    read_receipts: boolean;
  };
  profile: {
    display_name: string;
    username: string;
    bio: string;
  };
  account: {
    email: string;
    phone_number: string;
  };
  security: {
    two_factor_enabled: boolean;
    login_alerts: boolean;
  };
  preferences: {
    theme: "light" | "dark" | "system";
    autoplay_media: boolean;
  };
}

const DEFAULT_SETTINGS: SettingsConfig = {
  privacy: {
    lastseen: "contacts",
    online: "contacts",
    profile_picture: "everyone",
    about: "everyone",
    read_receipts: true,
  },
  profile: {
    display_name: "Keamogetswe Keagile",
    username: "keamogetswe",
    bio: "Full-stack developer building modern web experiences.",
  },
  account: {
    email: "keamogetswe@example.com",
    phone_number: "+27 82 000 0000",
  },
  security: {
    two_factor_enabled: false,
    login_alerts: true,
  },
  preferences: {
    theme: "system",
    autoplay_media: true,
  },
};

// --- Reusable Segmented Control Component ---
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (val: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center p-1 bg-neutral-100 rounded-lg text-xs font-medium text-neutral-600">
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1 rounded-md transition-all duration-150 cursor-pointer select-none ${
              isActive
                ? "bg-white text-neutral-900 shadow-xs font-semibold"
                : "hover:text-neutral-900 text-neutral-500"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// --- Reusable Toggle Switch Component ---
function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 ${
        checked ? "bg-neutral-900" : "bg-neutral-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsConfig>(DEFAULT_SETTINGS);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [savingField, setSavingField] = useState<
    "lastseen" | "profile_picture" | null
  >(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<
    "lastseen" | "profile_picture" | "load" | null
  >(null);

  useEffect(() => {
    let isMounted = true;

    async function loadConfig() {
      try {
        const response = await AccessTokenDeamon.fetch(
          "/api/profile/configure",
        );
        const body = (await response.json()) as {
          message?: string;
          config?: Partial<SettingsConfig["privacy"]>;
        };

        if (!response.ok) {
          throw new Error(body.message || "Could not load profile settings.");
        }

        if (isMounted) {
          setSettings((current) => ({
            ...current,
            privacy: {
              ...current.privacy,
              ...(body.config?.lastseen && {
                lastseen: body.config.lastseen,
              }),
              ...(body.config?.profile_picture && {
                profile_picture: body.config.profile_picture,
              }),
            },
          }));
        }
      } catch (cause) {
        if (isMounted) {
          setConfigError(
            cause instanceof Error
              ? cause.message
              : "Could not load profile settings.",
          );
          setErrorField("load");
        }
      } finally {
        if (isMounted) setIsLoadingConfig(false);
      }
    }

    void loadConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  const saveVisibilitySetting = async <
    K extends "lastseen" | "profile_picture",
  >(
    field: K,
    value: SettingsConfig["privacy"][K],
  ) => {
    if (isLoadingConfig || savingField) return;

    setSavingField(field);
    setConfigError(null);
    setErrorField(null);

    try {
      const response = await AccessTokenDeamon.fetch(
        "/api/profile/configure",
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ [field]: value }),
        },
      );
      const body = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(body.message || "Could not update profile settings.");
      }

      setSettings((current) => ({
        ...current,
        privacy: { ...current.privacy, [field]: value },
      }));
    } catch (cause) {
      setConfigError(
        cause instanceof Error
          ? cause.message
          : "Could not update profile settings.",
      );
      setErrorField(field);
    } finally {
      setSavingField(null);
    }
  };

  const updateNestedSetting = <
    K extends keyof SettingsConfig,
    F extends keyof SettingsConfig[K],
  >(
    category: K,
    field: F,
    value: SettingsConfig[K][F],
  ) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  if (isLoadingConfig) return <SettingsLoading />;

  return (
    <div className="w-full max-w-2xl mx-auto py-8 px-6 text-neutral-900 font-sans">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md pb-6 pt-2 border-b border-neutral-200 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Settings
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage your profile, security, and interface preferences.
          </p>
        </div>
      </div>

      <div className="divide-y divide-neutral-100 px-5">
        {/* --- PRIVACY --- */}
        <section className="py-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Privacy & Visibility
          </h2>
          {errorField === "load" && configError && (
            <p
              className="text-[11px] text-red-600"
              role="alert"
            >
              {configError}
            </p>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 group">
              <div>
                <span className="relative block w-fit text-xs font-medium text-neutral-800">
                  Last Seen
                  {(savingField === "lastseen" || errorField === "lastseen") && (
                    <span
                      className={`absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap text-[10px] font-normal ${errorField === "lastseen" ? "text-red-600" : "text-neutral-400"}`}
                      role={errorField === "lastseen" ? "alert" : "status"}
                    >
                      {errorField === "lastseen" ? (
                        "Failed"
                      ) : (
                        <span
                          aria-label="Saving last seen visibility"
                          className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800"
                        />
                      )}
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-neutral-400">
                  Who can see when you were last online
                </span>
              </div>
              <SegmentedControl
                options={[
                  { label: "Everyone", value: "everyone" },
                  { label: "Contacts", value: "contacts" },
                  { label: "Nobody", value: "nobody" },
                ]}
                value={settings.privacy.lastseen}
                disabled={savingField !== null}
                onChange={(val) => void saveVisibilitySetting("lastseen", val)}
              />
            </div>

            <div className="flex items-center justify-between py-2 group">
              <div>
                <span className="relative block w-fit text-xs font-medium text-neutral-800">
                  Profile Picture
                  {(savingField === "profile_picture" ||
                    errorField === "profile_picture") && (
                    <span
                      className={`absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap text-[10px] font-normal ${errorField === "profile_picture" ? "text-red-600" : "text-neutral-400"}`}
                      role={
                        errorField === "profile_picture" ? "alert" : "status"
                      }
                    >
                      {errorField === "profile_picture" ? (
                        "Failed"
                      ) : (
                        <span
                          aria-label="Saving profile picture visibility"
                          className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800"
                        />
                      )}
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-neutral-400">
                  Control picture visibility across channels
                </span>
              </div>
              <SegmentedControl
                options={[
                  { label: "Everyone", value: "everyone" },
                  { label: "Contacts", value: "contacts" },
                  { label: "Nobody", value: "nobody" },
                ]}
                value={settings.privacy.profile_picture}
                disabled={savingField !== null}
                onChange={(val) =>
                  void saveVisibilitySetting("profile_picture", val)
                }
              />
            </div>

            <div className="flex items-center justify-between py-2 group">
              <div>
                <span className="text-xs font-medium text-neutral-800 block">
                  Read Receipts
                </span>
                <span className="text-[11px] text-neutral-400">
                  Show indicators when you have read messages
                </span>
              </div>
              <Switch
                checked={settings.privacy.read_receipts}
                onChange={(val) =>
                  updateNestedSetting("privacy", "read_receipts", val)
                }
              />
            </div>
          </div>
        </section>
        {/* --- SECURITY --- */}
        <section className="py-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Security & Access
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 group">
              <div>
                <span className="text-xs font-medium text-neutral-800 block">
                  Two-Factor Authentication
                </span>
                <span className="text-[11px] text-neutral-400">
                  Require sign-in verification codes
                </span>
              </div>
              <Switch
                checked={settings.security.two_factor_enabled}
                onChange={(val) =>
                  updateNestedSetting("security", "two_factor_enabled", val)
                }
              />
            </div>

            <div className="flex items-center justify-between py-2 group">
              <div>
                <span className="text-xs font-medium text-neutral-800 block">
                  Login Alerts
                </span>
                <span className="text-[11px] text-neutral-400">
                  Notify on unrecognised browser sign-ins
                </span>
              </div>
              <Switch
                checked={settings.security.login_alerts}
                onChange={(val) =>
                  updateNestedSetting("security", "login_alerts", val)
                }
              />
            </div>
          </div>
        </section>

        {/* --- PREFERENCES --- */}
        <section className="py-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Appearance & Media
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 group">
              <div>
                <span className="text-xs font-medium text-neutral-800 block">
                  Interface Theme
                </span>
                <span className="text-[11px] text-neutral-400">
                  Choose visual appearance
                </span>
              </div>
              <SegmentedControl
                options={[
                  { label: "System", value: "system" },
                  { label: "Light", value: "light" },
                  { label: "Dark", value: "dark" },
                ]}
                value={settings.preferences.theme}
                onChange={(val) =>
                  updateNestedSetting("preferences", "theme", val)
                }
              />
            </div>

            <div className="flex items-center justify-between py-2 group">
              <div>
                <span className="text-xs font-medium text-neutral-800 block">
                  Autoplay Media
                </span>
                <span className="text-[11px] text-neutral-400">
                  Play embedded videos automatically
                </span>
              </div>
              <Switch
                checked={settings.preferences.autoplay_media}
                onChange={(val) =>
                  updateNestedSetting("preferences", "autoplay_media", val)
                }
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
