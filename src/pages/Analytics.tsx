import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, BookOpen, CheckCircle, Award, Sparkles, Download } from "lucide-react";

interface Course {
  id: string;
  course_code: string;
  course_name: string;
  credits: number;
}

interface Grade {
  id: string;
  course_id: string;
  letter_grade: string | null;
  grade_value: number | null;
  date_received: string | null;
}

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [gpa, setGpa] = useState(0);
  const [overallAttendance, setOverallAttendance] = useState(0);
  const [courses, setCourses] = useState<Course[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<any[]>([]);
  const [coursePerformance, setCoursePerformance] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [gradeTrends, setGradeTrends] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Fetch GPA
      const { data: gpaData, error: gpaError } = await supabase
        .rpc("calculate_gpa", { p_user_id: user?.id });

      if (!gpaError && gpaData !== null) {
        setGpa(gpaData);
      }

      // Fetch overall attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .rpc("calculate_attendance_percentage", { p_user_id: user?.id });

      if (!attendanceError && attendanceData !== null) {
        setOverallAttendance(attendanceData);
      }

      // Fetch courses
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .eq("user_id", user?.id);

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);

      // Fetch grades
      const { data: gradesData, error: gradesError } = await supabase
        .from("grades")
        .select("*")
        .eq("user_id", user?.id);

      if (gradesError) throw gradesError;
      setGrades(gradesData || []);

      // Calculate grade distribution
      const distribution: Record<string, number> = {};
      (gradesData || []).forEach((grade) => {
        if (grade.letter_grade) {
          distribution[grade.letter_grade] = (distribution[grade.letter_grade] || 0) + 1;
        }
      });

      const distributionData = Object.entries(distribution).map(([grade, count]) => ({
        grade,
        count,
      }));
      setGradeDistribution(distributionData);

      // Calculate course performance
      const performanceData = (coursesData || []).map((course) => {
        const courseGrades = (gradesData || []).filter((g) => g.course_id === course.id);
        const avgGrade = courseGrades.length > 0
          ? courseGrades.reduce((sum, g) => sum + (g.grade_value || 0), 0) / courseGrades.length
          : 0;

        return {
          name: course.course_code,
          performance: avgGrade,
        };
      });
      setCoursePerformance(performanceData);

      // Fetch grade trends
      const { data: trendsData, error: trendsError } = await supabase
        .rpc("get_grade_trends", { p_user_id: user?.id, p_months: 6 });
      
      if (!trendsError && trendsData) {
        setGradeTrends(trendsData);
      }
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAIInsights = async () => {
    try {
      setLoadingInsights(true);
      const { data, error } = await supabase.functions.invoke('study-insights', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;
      setAiInsights(data.insights);
      toast.success("AI insights generated!");
    } catch (error: any) {
      console.error("Error fetching AI insights:", error);
      toast.error("Failed to generate AI insights");
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleExportData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('export-data', {
        body: { format: 'json' },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;

      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `academic-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Data exported successfully!");
    } catch (error: any) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data");
    }
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Academic Analytics</h1>
          <p className="text-muted-foreground">Insights into your academic performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportData}>
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button onClick={fetchAIInsights} disabled={loadingInsights}>
            <Sparkles className="mr-2 h-4 w-4" />
            {loadingInsights ? "Generating..." : "AI Insights"}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current GPA</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gpa.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Out of 4.0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallAttendance.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Overall attendance rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {courses.length}
            </div>
            <p className="text-xs text-muted-foreground">Currently enrolled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {courses.reduce((sum, c) => sum + c.credits, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Credit hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Course Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Course Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {coursePerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={coursePerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="performance" fill="#8884d8" name="Average Grade (%)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">
                No performance data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Grade Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {gradeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={gradeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ grade, count }) => `${grade}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {gradeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">
                No grade distribution data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grade Trends */}
      {gradeTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Grade Trends (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={gradeTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="average_grade" stroke="#8884d8" name="Average Grade (%)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI-Powered Study Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aiInsights ? (
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm">{aiInsights}</div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                Get personalized study recommendations based on your academic performance
              </p>
              <Button onClick={fetchAIInsights} disabled={loadingInsights}>
                {loadingInsights ? "Generating..." : "Generate AI Insights"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
