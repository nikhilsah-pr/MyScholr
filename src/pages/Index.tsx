import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { GraduationCap, BookOpen, Calendar, TrendingUp } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const Index = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    gpa: 0,
    attendance: 0,
    coursesCount: 0,
    upcomingClasses: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Load courses count
      const { count: coursesCount } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active");

      // Load GPA
      const { data: gpaData } = await supabase.rpc("calculate_gpa", {
        p_user_id: user.id,
      });

      // Load attendance
      const { data: attendanceData } = await supabase.rpc(
        "calculate_attendance_percentage",
        { p_user_id: user.id }
      );

      setStats({
        gpa: gpaData || 0,
        attendance: attendanceData || 0,
        coursesCount: coursesCount || 0,
        upcomingClasses: 0,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading dashboard",
        description: error.message,
      });
    } finally {
      setLoading(false);
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
          <h2 className="text-2xl font-bold tracking-tight">
            Welcome back!
          </h2>
          <p className="text-muted-foreground">
            Here's your academic overview
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">GPA</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.gpa.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Out of 4.0</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Attendance
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.attendance.toFixed(0)}%
              </div>
              <p className="text-xs text-muted-foreground">Overall rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.coursesCount}</div>
              <p className="text-xs text-muted-foreground">Active courses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">On Track</div>
              <p className="text-xs text-muted-foreground">
                Academic standing
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href="/digital-id"
              className="rounded-lg border p-4 text-left transition-colors hover:bg-muted block"
            >
              <GraduationCap className="mb-2 h-8 w-8 text-primary" />
              <h3 className="font-semibold">View Digital ID</h3>
              <p className="text-sm text-muted-foreground">
                Access your student ID card
              </p>
            </a>
            <a
              href="/schedule"
              className="rounded-lg border p-4 text-left transition-colors hover:bg-muted block"
            >
              <Calendar className="mb-2 h-8 w-8 text-primary" />
              <h3 className="font-semibold">Check Schedule</h3>
              <p className="text-sm text-muted-foreground">
                View today's classes
              </p>
            </a>
            <a
              href="/analytics"
              className="rounded-lg border p-4 text-left transition-colors hover:bg-muted block"
            >
              <TrendingUp className="mb-2 h-8 w-8 text-primary" />
              <h3 className="font-semibold">View Grades</h3>
              <p className="text-sm text-muted-foreground">
                Check your performance
              </p>
            </a>
          </CardContent>
        </Card>
      </Container>
    </AppLayout>
  );
};

export default Index;
