import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Plus, Search, BookOpen, MapPin, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AddCourseDialog } from "@/components/courses/AddCourseDialog";

const Courses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    loadCourses();
  }, [user]);

  const loadCourses = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading courses",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = 
      course.course_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.course_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructor_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSemester = selectedSemester === "all" || course.semester === selectedSemester;
    
    return matchesSearch && matchesSemester;
  });

  const semesters = Array.from(new Set(courses.map(c => c.semester)));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-accent text-accent-foreground";
      case "completed": return "bg-primary/10 text-primary";
      case "dropped": return "bg-destructive/10 text-destructive";
      default: return "bg-muted";
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">My Courses</h2>
            <p className="text-muted-foreground">Manage your enrolled courses</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Course
          </Button>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={selectedSemester === "all" ? "default" : "outline"}
              onClick={() => setSelectedSemester("all")}
              size="sm"
            >
              All
            </Button>
            {semesters.map((semester) => (
              <Button
                key={semester}
                variant={selectedSemester === semester ? "default" : "outline"}
                onClick={() => setSelectedSemester(semester)}
                size="sm"
              >
                {semester}
              </Button>
            ))}
          </div>
        </div>

        {filteredCourses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No courses found</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {searchQuery ? "Try adjusting your search" : "Start by adding your first course"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Course
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course) => (
              <Card
                key={course.id}
                className="cursor-pointer transition-shadow hover:shadow-lg"
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">{course.course_code}</p>
                      <CardTitle className="mt-1 line-clamp-2">{course.course_name}</CardTitle>
                    </div>
                    <Badge className={getStatusColor(course.status)}>
                      {course.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {course.instructor_name && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <User className="mr-2 h-4 w-4" />
                      {course.instructor_name}
                    </div>
                  )}
                  {course.location && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="mr-2 h-4 w-4" />
                      {course.location}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{course.credits} credits</span>
                    <span className="text-sm font-medium">{course.semester} {course.academic_year}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AddCourseDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onSuccess={loadCourses}
        />
      </Container>
    </AppLayout>
  );
};

export default Courses;
