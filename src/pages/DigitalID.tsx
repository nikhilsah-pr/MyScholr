import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Download, Share2, User } from "lucide-react";
import QRCode from "qrcode";

const DigitalID = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState("");
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
      
      // Generate QR code with student ID
      const qrData = JSON.stringify({
        student_id: data.student_id || user.id,
        name: data.full_name,
        email: data.email,
      });
      
      const qr = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: "#1E40AF",
          light: "#FFFFFF",
        },
      });
      
      setQrCode(qr);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading ID",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "My Student ID",
          text: `Student ID: ${profile?.student_id || user?.id}`,
        });
      } else {
        await navigator.clipboard.writeText(profile?.student_id || user?.id || "");
        toast({
          title: "Copied to clipboard",
          description: "Your student ID has been copied.",
        });
      }
    } catch (error) {
      console.error("Share failed", error);
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = qrCode;
    link.download = `student-id-${profile?.student_id || user?.id}.png`;
    link.click();
  };

  if (loading) {
    return (
      <AppLayout>
        <Container className="py-6">
          <LoadingSpinner size="lg" />
        </Container>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Container className="py-6">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Digital Student ID</h2>
          <p className="text-muted-foreground">Your official student identification</p>
        </div>

        <div className="mx-auto max-w-md">
          <Card className="overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-primary to-primary/70" />
            
            <CardContent className="relative -mt-16 space-y-6 p-6">
              <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border-4 border-background bg-muted">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <User className="h-16 w-16 text-muted-foreground" />
                )}
              </div>

              <div className="text-center">
                <h3 className="text-2xl font-bold">{profile?.full_name || "Student Name"}</h3>
                <p className="text-lg text-muted-foreground">
                  ID: {profile?.student_id || user?.id?.slice(0, 8)}
                </p>
              </div>

              <div className="space-y-2 rounded-lg bg-muted/50 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Program:</span>
                  <span className="font-medium">{profile?.program || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Major:</span>
                  <span className="font-medium">{profile?.major || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Year:</span>
                  <span className="font-medium">{profile?.year_of_study || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{profile?.email}</span>
                </div>
              </div>

              {qrCode && (
                <div className="rounded-lg border bg-background p-4">
                  <p className="mb-3 text-center text-sm text-muted-foreground">
                    Scan this QR code for verification
                  </p>
                  <div className="flex justify-center">
                    <img src={qrCode} alt="QR Code" className="h-64 w-64" />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleShare} className="flex-1">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
                <Button variant="outline" onClick={handleDownload} className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Container>
    </AppLayout>
  );
};

export default DigitalID;
