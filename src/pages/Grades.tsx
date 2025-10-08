import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { TrendingUp, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const Grades = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [gpa, setGpa] = useState<number>(0);
  const [grades, setGrades] = useState<any[]>([]);
  const [courseGrades, setCourseGrades] = useState<any[]>([]);

  useEffect(() => {
    loadGrades();
  }, [user]);

  const loadGrades = async () => {
    if (!user) return;
    
    try {
      // Load GPA
      const { data: gpaData, error: gpaError } = await supabase
        .rpc("calculate_gpa", { p_user_id: user.id });

      if (gpaError) throw gpaError;
      setGpa(gpaData || 0);

      // Load grades with course info
      const { data: gradesData, error: gradesError } = await supabase
        .from("grades")
        .select("*, courses(*)")
        .eq("user_id", user.id)
        .order("date_received", { ascending: false });

      if (gradesError) throw gradesError;
      setGrades(gradesData || []);

      // Group grades by course
      const grouped = (gradesData || []).reduce((acc: any, grade: any) => {
        const courseId = grade.course_id;
        if (!acc[courseId]) {
          acc[courseId] = {
            course: grade.courses,
            grades: [],
          };
        }
        acc[courseId].grades.push(grade);
        return acc;
      }, {});

      setCourseGrades(Object.values(grouped));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading grades",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (letterGrade: string) => {
    if (letterGrade.startsWith("A")) return "text-accent";
    if (letterGrade.startsWith("B")) return "text-primary";
    if (letterGrade.startsWith("C")) return "text-yellow-600";
    if (letterGrade.startsWith("D")) return "text-orange-600";
    return "text-destructive";
  };

  const calculateCourseAverage = (courseGradeList: any[]) => {
    if (courseGradeList.length === 0) return null;
    
    const total = courseGradeList.reduce((sum, g) => {
      if (g.grade_value && g.max_value) {
        return sum + (g.grade_value / g.max_value) * 100;
      }
      return sum;
    }, 0);
    
    return (total / courseGradeList.length).toFixed(1);
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
          <h2 className="text-2xl font-bold tracking-tight">Grades & Performance</h2>
          <p className="text-muted-foreground">Track your academic progress</p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall GPA</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{gpa.toFixed(2)}</div>
              <Progress value={(gpa / 4.0) * 100} className="mt-2" />
              <p className="mt-2 text-xs text-muted-foreground">Out of 4.0</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{courseGrades.length}</div>
              <p className="mt-2 text-xs text-muted-foreground">
                {grades.length} total grades recorded
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {courseGrades.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Award className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No grades yet</h3>
                <p className="text-sm text-muted-foreground">
                  Your grades will appear here once they're added
                </p>
              </CardContent>
            </Card>
          ) : (
            courseGrades.map((courseData: any) => {
              const average = calculateCourseAverage(courseData.grades);
              
              return (
                <Card key={courseData.course?.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {courseData.course?.course_code}
                        </p>
                        <CardTitle className="mt-1">{courseData.course?.course_name}</CardTitle>
                      </div>
                      {average && (
                        <div className="text-right">
                          <p className="text-2xl font-bold">{average}%</p>
                          <p className="text-xs text-muted-foreground">Course Average</p>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {courseData.grades.map((grade: any) => (
                        <div key={grade.id} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <p className="font-medium">{grade.grade_type}</p>
                            {grade.date_received && (
                              <p className="text-xs text-muted-foreground">
                                {new Date(grade.date_received).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            {grade.letter_grade ? (
                              <p className={`text-xl font-bold ${getGradeColor(grade.letter_grade)}`}>
                                {grade.letter_grade}
                              </p>
                            ) : grade.grade_value !== null ? (
                              <p className="text-xl font-bold">
                                {grade.grade_value}
                                {grade.max_value && `/${grade.max_value}`}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground">Not graded</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </Container>
    </AppLayout>
  );
};

export default Grades;
