import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bell, Calendar, Award, BookOpen } from "lucide-react";

interface NotificationSettings {
  gradeUpdates: boolean;
  attendanceAlerts: boolean;
  upcomingClasses: boolean;
  assignmentDueDates: boolean;
  calendarReminders: boolean;
}

export default function NotificationPreferences() {
  const [settings, setSettings] = useState<NotificationSettings>({
    gradeUpdates: true,
    attendanceAlerts: true,
    upcomingClasses: true,
    assignmentDueDates: true,
    calendarReminders: true,
  });

  const [saving, setSaving] = useState(false);

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real implementation, this would save to the database
      // For now, we'll just save to localStorage
      localStorage.setItem('notificationPreferences', JSON.stringify(settings));
      toast.success("Notification preferences saved");
    } catch (error) {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Manage your notification settings for academic updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Award className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="gradeUpdates" className="font-medium">Grade Updates</Label>
                <p className="text-sm text-muted-foreground">Get notified when new grades are posted</p>
              </div>
            </div>
            <Switch
              id="gradeUpdates"
              checked={settings.gradeUpdates}
              onCheckedChange={() => handleToggle('gradeUpdates')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="attendanceAlerts" className="font-medium">Attendance Alerts</Label>
                <p className="text-sm text-muted-foreground">Alerts for low attendance rates</p>
              </div>
            </div>
            <Switch
              id="attendanceAlerts"
              checked={settings.attendanceAlerts}
              onCheckedChange={() => handleToggle('attendanceAlerts')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="upcomingClasses" className="font-medium">Upcoming Classes</Label>
                <p className="text-sm text-muted-foreground">Reminders for upcoming classes</p>
              </div>
            </div>
            <Switch
              id="upcomingClasses"
              checked={settings.upcomingClasses}
              onCheckedChange={() => handleToggle('upcomingClasses')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="assignmentDueDates" className="font-medium">Assignment Due Dates</Label>
                <p className="text-sm text-muted-foreground">Reminders for assignment deadlines</p>
              </div>
            </div>
            <Switch
              id="assignmentDueDates"
              checked={settings.assignmentDueDates}
              onCheckedChange={() => handleToggle('assignmentDueDates')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="calendarReminders" className="font-medium">Calendar Reminders</Label>
                <p className="text-sm text-muted-foreground">Reminders for calendar events</p>
              </div>
            </div>
            <Switch
              id="calendarReminders"
              checked={settings.calendarReminders}
              onCheckedChange={() => handleToggle('calendarReminders')}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
