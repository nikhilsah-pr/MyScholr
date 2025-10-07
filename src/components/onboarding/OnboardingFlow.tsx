import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, Calendar, BookOpen, CheckCircle } from "lucide-react";

interface OnboardingFlowProps {
  onComplete: () => void;
}

const features = [
  {
    icon: GraduationCap,
    title: "Digital Student ID",
    description: "Access your student ID card anytime, anywhere with QR code verification.",
  },
  {
    icon: BookOpen,
    title: "Academic Management",
    description: "Track your courses, grades, and GPA all in one place.",
  },
  {
    icon: Calendar,
    title: "Schedule & Attendance",
    description: "Never miss a class with smart scheduling and attendance tracking.",
  },
  {
    icon: CheckCircle,
    title: "Progress Analytics",
    description: "Visualize your academic progress and get personalized insights.",
  },
];

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const progress = ((currentStep + 1) / features.length) * 100;

  const handleNext = () => {
    if (currentStep < features.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const feature = features[currentStep];
  const Icon = feature.icon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="mb-6">
            <Progress value={progress} className="h-2" />
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {currentStep + 1} of {features.length}
            </p>
          </div>

          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Icon className="h-10 w-10 text-primary" />
            </div>

            <div>
              <h2 className="text-2xl font-bold">{feature.title}</h2>
              <p className="mt-2 text-muted-foreground">{feature.description}</p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleSkip} className="flex-1">
                Skip
              </Button>
              <Button onClick={handleNext} className="flex-1">
                {currentStep < features.length - 1 ? "Next" : "Get Started"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
