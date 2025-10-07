import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  institutionName?: string;
  institutionLogo?: string;
}

export const Header = ({ institutionName = "MyScholr", institutionLogo }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {institutionLogo ? (
            <img src={institutionLogo} alt={institutionName} className="h-8 w-8 rounded-md object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
              MS
            </div>
          )}
          <h1 className="text-lg font-semibold tracking-tight">{institutionName}</h1>
        </div>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
        </Button>
      </div>
    </header>
  );
};
