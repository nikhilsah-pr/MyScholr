import { ReactNode } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";

interface AppLayoutProps {
  children: ReactNode;
  institutionName?: string;
  institutionLogo?: string;
}

export const AppLayout = ({ children, institutionName, institutionLogo }: AppLayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header institutionName={institutionName} institutionLogo={institutionLogo} />
      
      <main className="flex-1 pb-16">
        {children}
      </main>

      <BottomNav />
    </div>
  );
};
