"use client";

import { useState } from "react";

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
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (val: T) => void;
}) {
  return (
    <div className="inline-flex items-center p-1 bg-neutral-100 rounded-lg text-xs font-medium text-neutral-600">
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1 rounded-md transition-all duration-150 cursor-pointer select-none ${
              isActive
                ? "bg-white text-neutral-900 shadow-xs font-semibold"
                : "hover:text-neutral-900 text-neutral-500"
            }`}
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
  const [isSaved, setIsSaved] = useState(false);

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

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 group">
              <div>
                <span className="text-xs font-medium text-neutral-800 block">
                  Last Seen
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
                onChange={(val) =>
                  updateNestedSetting("privacy", "lastseen", val)
                }
              />
            </div>

            <div className="flex items-center justify-between py-2 group">
              <div>
                <span className="text-xs font-medium text-neutral-800 block">
                  Profile Picture
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
                onChange={(val) =>
                  updateNestedSetting("privacy", "profile_picture", val)
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
