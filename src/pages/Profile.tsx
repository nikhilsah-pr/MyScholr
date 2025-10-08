import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { User, Mail, Phone, School, BookOpen } from "lucide-react";

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    student_id: "",
    phone: "",
    program: "",
    major: "",
    year_of_study: "",
  });

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
      
      if (data) {
        setProfile({
          full_name: data.full_name || "",
          student_id: data.student_id || "",
          phone: data.phone || "",
          program: data.program || "",
          major: data.major || "",
          year_of_study: data.year_of_study?.toString() || "",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading profile",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          student_id: profile.student_id,
          phone: profile.phone,
          program: profile.program,
          major: profile.major,
          year_of_study: profile.year_of_study ? parseInt(profile.year_of_study) : null,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating profile",
        description: error.message,
      });
    } finally {
      setSaving(false);
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
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Academic Profile</h2>
          <p className="text-muted-foreground">Manage your personal and academic information</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">
                  <User className="mr-2 inline h-4 w-4" />
                  Full Name
                </Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="mr-2 inline h-4 w-4" />
                  Email
                </Label>
                <Input id="email" value={user?.email || ""} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="mr-2 inline h-4 w-4" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="student_id">Student ID</Label>
                <Input
                  id="student_id"
                  value={profile.student_id}
                  onChange={(e) => setProfile({ ...profile, student_id: e.target.value })}
                  placeholder="STU123456"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Academic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="program">
                  <School className="mr-2 inline h-4 w-4" />
                  Program
                </Label>
                <Input
                  id="program"
                  value={profile.program}
                  onChange={(e) => setProfile({ ...profile, program: e.target.value })}
                  placeholder="Bachelor of Science"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="major">
                  <BookOpen className="mr-2 inline h-4 w-4" />
                  Major
                </Label>
                <Input
                  id="major"
                  value={profile.major}
                  onChange={(e) => setProfile({ ...profile, major: e.target.value })}
                  placeholder="Computer Science"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="year_of_study">Year of Study</Label>
                <Input
                  id="year_of_study"
                  type="number"
                  min="1"
                  max="10"
                  value={profile.year_of_study}
                  onChange={(e) => setProfile({ ...profile, year_of_study: e.target.value })}
                  placeholder="1"
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <LoadingSpinner size="sm" /> : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </Container>
    </AppLayout>
  );
};

export default Profile;
