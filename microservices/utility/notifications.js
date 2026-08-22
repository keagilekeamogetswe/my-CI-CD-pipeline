const Notification = (() => {
  return {
    SMS: {
      send: async (phone_number, message) => {},
    },
    EMAIL: {
      send: async (email, subject, body) => {},
    },
  };
})();

export { Notification };
