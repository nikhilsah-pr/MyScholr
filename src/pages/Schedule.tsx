import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Clock, MapPin } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const Schedule = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  useEffect(() => {
    loadSchedules();
  }, [user]);

  const loadSchedules = async () => {
    if (!user) return;
    
    try {
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (coursesError) throw coursesError;

      const courseIds = coursesData?.map(c => c.id) || [];
      
      if (courseIds.length === 0) {
        setSchedules([]);
        setLoading(false);
        return;
      }

      const { data: schedulesData, error: schedulesError } = await supabase
        .from("schedules")
        .select("*, courses(*)")
        .in("course_id", courseIds)
        .order("start_time");

      if (schedulesError) throw schedulesError;

      setSchedules(schedulesData || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading schedule",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getScheduleForDay = (day: number) => {
    return schedules.filter(s => s.day_of_week === day);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
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
          <h2 className="text-2xl font-bold tracking-tight">Class Schedule</h2>
          <p className="text-muted-foreground">View your weekly class timetable</p>
        </div>

        <Tabs value={selectedDay.toString()} onValueChange={(v) => setSelectedDay(parseInt(v))}>
          <TabsList className="mb-6 grid w-full grid-cols-7 lg:w-auto">
            {DAYS.map((day, index) => (
              <TabsTrigger key={day} value={index.toString()} className="text-xs sm:text-sm">
                {day.slice(0, 3)}
              </TabsTrigger>
            ))}
          </TabsList>

          {DAYS.map((day, index) => {
            const daySchedule = getScheduleForDay(index);
            
            return (
              <TabsContent key={day} value={index.toString()}>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{day}</h3>
                  
                  {daySchedule.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">No classes scheduled for this day</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {daySchedule.map((schedule) => (
                        <Card key={schedule.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                  {schedule.courses?.course_code}
                                </p>
                                <CardTitle className="mt-1">{schedule.courses?.course_name}</CardTitle>
                              </div>
                              <Badge variant="outline">
                                {schedule.courses?.credits} credits
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex items-center text-sm">
                              <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span>
                                {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                              </span>
                            </div>
                            {schedule.location && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <MapPin className="mr-2 h-4 w-4" />
                                {schedule.location}
                              </div>
                            )}
                            {schedule.courses?.instructor_name && (
                              <p className="text-sm text-muted-foreground">
                                Instructor: {schedule.courses.instructor_name}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </Container>
    </AppLayout>
  );
};

export default Schedule;
