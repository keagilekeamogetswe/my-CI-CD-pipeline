export type ViewName = "chats" | "explore" | "events" | "notifications";

export type NavItem = {
  id: ViewName;
  label: string;
  badge?: number;
};

export const navItems: NavItem[] = [
  { id: "chats", label: "Chats", badge: 4 },
  { id: "explore", label: "Explore" },
  { id: "events", label: "Events" },
  { id: "notifications", label: "Notifications", badge: 7 },
];

export function getViewPath(view: ViewName) {
  return `/${view}`;
}
