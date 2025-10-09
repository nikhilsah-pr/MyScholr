import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Monitor, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export const SessionManagement = () => {
  const { session } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  useEffect(() => {
    if (session) {
      setSessionInfo({
        current: true,
        device: getDeviceType(),
        lastActive: new Date().toLocaleString(),
        ipAddress: "Hidden for privacy",
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : "Unknown",
      });
    }
  }, [session]);

  const getDeviceType = () => {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return "Tablet";
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return "Mobile";
    }
    return "Desktop";
  };

  const handleSignOutAllDevices = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      toast({
        title: "Signed out from all devices",
        description: "You have been signed out from all sessions.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const getDeviceIcon = (device: string) => {
    if (device === "Mobile") return <Smartphone className="h-4 w-4" />;
    if (device === "Desktop") return <Monitor className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  if (!sessionInfo) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Sessions</CardTitle>
        <CardDescription>Manage your active login sessions across devices</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {getDeviceIcon(sessionInfo.device)}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{sessionInfo.device}</p>
                  <Badge variant="secondary">Current</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Last active: {sessionInfo.lastActive}
                </p>
                <p className="text-sm text-muted-foreground">
                  Session expires: {sessionInfo.expiresAt}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                Security Notice
              </p>
              <p className="text-sm text-orange-800 dark:text-orange-200">
                If you notice any suspicious activity, sign out from all devices immediately.
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="destructive"
          className="w-full"
          onClick={handleSignOutAllDevices}
        >
          Sign Out All Devices
        </Button>
      </CardContent>
    </Card>
  );
};
