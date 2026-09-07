import type { ReactNode } from "react";
import MainView from "./main.view";

export default function MainLayout({ children }: { children: ReactNode }) {
  return <MainView>{children}</MainView>;
}
