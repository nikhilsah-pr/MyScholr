import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { format, isSameDay } from "date-fns";
import { Plus, Calendar as CalendarIcon, Clock, BookOpen } from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string;
  is_all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  priority: string;
  course_id: string | null;
}

interface Course {
  id: string;
  course_code: string;
  course_name: string;
}

export default function Calendar() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [eventDates, setEventDates] = useState<Date[]>([]);

  useEffect(() => {
    if (user) {
      fetchEvents();
      fetchCourses();
    }
  }, [user]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user?.id)
        .order("event_date", { ascending: true });

      if (error) throw error;
      setEvents(data || []);

      // Extract dates for calendar highlighting
      const dates = (data || []).map((e) => new Date(e.event_date));
      setEventDates(dates);
    } catch (error: any) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load calendar events");
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("id, course_code, course_name")
        .eq("user_id", user?.id);

      if (error) throw error;
      setCourses(data || []);
    } catch (error: any) {
      console.error("Error fetching courses:", error);
    }
  };

  const getCourseName = (courseId: string | null) => {
    if (!courseId) return null;
    const course = courses.find((c) => c.id === courseId);
    return course ? `${course.course_code}` : null;
  };

  const getEventTypeColor = (type: string): "default" | "destructive" | "outline" | "secondary" => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      exam: "destructive",
      assignment: "default",
      deadline: "secondary",
      personal: "outline",
    };
    return colors[type] || "default";
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: "text-red-600",
      normal: "text-yellow-600",
      low: "text-green-600",
    };
    return colors[priority] || "text-gray-600";
  };

  const selectedDateEvents = selectedDate
    ? events.filter((e) => isSameDay(new Date(e.event_date), selectedDate))
    : [];

  const upcomingEvents = events.filter(
    (e) => new Date(e.event_date) >= new Date()
  ).slice(0, 5);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Academic Calendar</h1>
          <p className="text-muted-foreground">Track important dates and deadlines</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Event
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              modifiers={{
                eventDay: eventDates,
              }}
              modifiersClassNames={{
                eventDay: "bg-primary/20 font-bold",
              }}
            />
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="border-l-4 border-primary pl-3 py-2">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-sm">{event.title}</h4>
                      <Badge variant={getEventTypeColor(event.event_type)} className="text-xs">
                        {event.event_type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {format(new Date(event.event_date), "MMM dd, yyyy")}
                    </p>
                    {!event.is_all_day && event.start_time && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {event.start_time}
                      </p>
                    )}
                    {getCourseName(event.course_id) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {getCourseName(event.course_id)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No upcoming events
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selected Date Events */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>
              Events on {format(selectedDate, "MMMM dd, yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {selectedDateEvents.map((event) => (
                  <Card key={event.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{event.title}</CardTitle>
                        <Badge variant={getEventTypeColor(event.event_type)}>
                          {event.event_type}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {event.description && (
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      )}
                      {!event.is_all_day && event.start_time && (
                        <p className="text-sm flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {event.start_time}
                          {event.end_time && ` - ${event.end_time}`}
                        </p>
                      )}
                      {getCourseName(event.course_id) && (
                        <p className="text-sm flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          {getCourseName(event.course_id)}
                        </p>
                      )}
                      <p className={`text-sm font-medium ${getPriorityColor(event.priority)}`}>
                        Priority: {event.priority.charAt(0).toUpperCase() + event.priority.slice(1)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No events scheduled for this date
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
