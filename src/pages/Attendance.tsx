import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { format } from "date-fns";
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";

interface Course {
  id: string;
  course_code: string;
  course_name: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  course_id: string;
  notes: string | null;
}

interface CourseAttendance {
  course: Course;
  percentage: number;
  total: number;
  present: number;
  records: AttendanceRecord[];
}

export default function Attendance() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [courseAttendance, setCourseAttendance] = useState<CourseAttendance[]>([]);
  const [overallPercentage, setOverallPercentage] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [attendanceDates, setAttendanceDates] = useState<Date[]>([]);

  useEffect(() => {
    if (user) {
      fetchAttendanceData();
    }
  }, [user]);

  // Real-time subscription for attendance
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("attendance-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchAttendanceData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);

      // Fetch courses
      const { data: courses, error: coursesError } = await supabase
        .from("courses")
        .select("id, course_code, course_name")
        .eq("user_id", user?.id)
        .eq("status", "active");

      if (coursesError) throw coursesError;

      // Fetch all attendance records
      const { data: attendance, error: attendanceError } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user?.id)
        .order("date", { ascending: false });

      if (attendanceError) throw attendanceError;

      // Calculate overall percentage
      const { data: overallData, error: overallError } = await supabase
        .rpc("calculate_attendance_percentage", { p_user_id: user?.id });

      if (!overallError && overallData !== null) {
        setOverallPercentage(overallData);
      }

      // Group attendance by course
      const courseAttendanceData: CourseAttendance[] = (courses || []).map((course) => {
        const courseRecords = (attendance || []).filter((a) => a.course_id === course.id);
        const present = courseRecords.filter((a) => a.status === "present" || a.status === "late").length;
        const total = courseRecords.length;
        const percentage = total > 0 ? (present / total) * 100 : 0;

        return {
          course,
          percentage,
          total,
          present,
          records: courseRecords,
        };
      });

      setCourseAttendance(courseAttendanceData);

      // Extract all attendance dates for calendar highlighting
      const dates = (attendance || []).map((a) => new Date(a.date));
      setAttendanceDates(dates);
    } catch (error: any) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "absent":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "late":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "excused":
        return <AlertTriangle className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      present: "default",
      absent: "destructive",
      late: "secondary",
      excused: "outline",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Attendance Tracking</h1>
        <p className="text-muted-foreground">Monitor your class attendance and patterns</p>
      </div>

      {/* Overall Attendance */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">{overallPercentage.toFixed(1)}%</span>
              <span className={`text-sm font-medium ${getAttendanceColor(overallPercentage)}`}>
                {overallPercentage >= 80 ? "Good Standing" : overallPercentage >= 70 ? "Warning" : "Critical"}
              </span>
            </div>
            <Progress value={overallPercentage} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Course-wise Attendance */}
      <div className="grid gap-4 md:grid-cols-2">
        {courseAttendance.map(({ course, percentage, total, present, records }) => (
          <Card key={course.id}>
            <CardHeader>
              <CardTitle className="text-lg">
                {course.course_code} - {course.course_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Present: {present}/{total}</span>
                  <span className={`font-semibold ${getAttendanceColor(percentage)}`}>
                    {percentage.toFixed(1)}%
                  </span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>

              {records.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Recent Records</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {records.slice(0, 5).map((record) => (
                      <div key={record.id} className="flex justify-between items-center text-sm">
                        <span>{format(new Date(record.date), "MMM dd, yyyy")}</span>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(record.status)}
                          {getStatusBadge(record.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {courseAttendance.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No attendance records found. Start by adding courses.</p>
          </CardContent>
        </Card>
      )}

      {/* Attendance Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Calendar</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
            modifiers={{
              attended: attendanceDates,
            }}
            modifiersClassNames={{
              attended: "bg-primary/20 font-bold",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
