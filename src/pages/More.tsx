import { AppLayout } from "@/components/layout/AppLayout";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  User, 
  FileText, 
  Calendar, 
  BarChart3, 
  Settings, 
  HelpCircle,
  IdCard,
} from "lucide-react";

const menuItems = [
  {
    icon: IdCard,
    title: "Digital ID Card",
    description: "View your student ID with QR code",
    path: "/digital-id",
    color: "text-primary",
  },
  {
    icon: User,
    title: "Profile",
    description: "Manage your personal information",
    path: "/profile",
    color: "text-blue-600",
  },
  {
    icon: FileText,
    title: "Documents",
    description: "Access your academic documents",
    path: "/documents",
    color: "text-purple-600",
  },
  {
    icon: Calendar,
    title: "Calendar",
    description: "View academic events and deadlines",
    path: "/calendar",
    color: "text-orange-600",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "View your performance insights",
    path: "/analytics",
    color: "text-accent",
  },
  {
    icon: Settings,
    title: "Settings",
    description: "Customize your preferences",
    path: "/settings",
    color: "text-gray-600",
  },
  {
    icon: HelpCircle,
    title: "Help & Support",
    description: "Get help and contact support",
    path: "/help",
    color: "text-pink-600",
  },
];

const More = () => {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <Container className="py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">More</h2>
          <p className="text-muted-foreground">Access additional features and settings</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.path}
                className="cursor-pointer transition-shadow hover:shadow-lg"
                onClick={() => navigate(item.path)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg bg-muted p-2 ${item.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Container>
    </AppLayout>
  );
};

export default More;
