export default {
  privacy: {
    lastseen: "contacts",
    profile_picture: "everyone",
    about: "everyone",
    online: "contacts",
  },
  notifications: {
    push: true,
    previews: true,
    sounds: true,
  },
  safety: {
    blocked_contacts: [],
  },
  recovery: {
    swift_recovery_enabled: false,
    allow_synced_number_auth: false,
    backup: {
      tier: "free",
      storage_limit_mb: 512,
      used_storage_mb: 0,
    },
    retention: {
      passwordless_days: 45,
      claimed_number_grace_days: 7,
    },
  },
  profile: {
    bio: "",
    profile_picture_url: "",
  },
};
