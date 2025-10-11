import { useEffect, useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Container } from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Download, Share2, User, Camera } from "lucide-react";
import QRCode from "qrcode";

const DigitalID = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please upload an image file.",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5242880) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
      });
      return;
    }

    try {
      setUploading(true);

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Profile picture updated successfully.",
      });

      // Reload profile
      await loadProfile();
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
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
              <div className="relative mx-auto w-32">
                <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-background bg-muted overflow-hidden">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-16 w-16 text-muted-foreground" />
                  )}
                </div>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 h-10 w-10 rounded-full shadow-lg"
                  onClick={handleUploadClick}
                  disabled={uploading}
                >
                  {uploading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
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
