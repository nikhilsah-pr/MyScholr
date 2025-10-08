-- Create courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_code TEXT NOT NULL,
  course_name TEXT NOT NULL,
  instructor_name TEXT,
  instructor_email TEXT,
  instructor_phone TEXT,
  semester TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  credits DECIMAL(3,1) NOT NULL DEFAULT 3.0,
  location TEXT,
  description TEXT,
  syllabus_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create schedule table for class timings
CREATE TABLE public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create grades table
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  grade_type TEXT NOT NULL,
  grade_value DECIMAL(5,2),
  letter_grade TEXT,
  max_value DECIMAL(5,2),
  weight DECIMAL(5,2),
  date_received TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, course_id, date)
);

-- Create assignments table
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create documents table for academic documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  category TEXT,
  tags TEXT[],
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses
CREATE POLICY "Users can view their own courses"
  ON public.courses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own courses"
  ON public.courses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own courses"
  ON public.courses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own courses"
  ON public.courses FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for schedules
CREATE POLICY "Users can view schedules for their courses"
  ON public.schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = schedules.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage schedules for their courses"
  ON public.schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = schedules.course_id
      AND courses.user_id = auth.uid()
    )
  );

-- RLS Policies for grades
CREATE POLICY "Users can view their own grades"
  ON public.grades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own grades"
  ON public.grades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own grades"
  ON public.grades FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own grades"
  ON public.grades FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for attendance
CREATE POLICY "Users can view their own attendance"
  ON public.attendance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own attendance"
  ON public.attendance FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for assignments
CREATE POLICY "Users can view assignments for their courses"
  ON public.assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = assignments.course_id
      AND courses.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage assignments for their courses"
  ON public.assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = assignments.course_id
      AND courses.user_id = auth.uid()
    )
  );

-- RLS Policies for documents
CREATE POLICY "Users can view their own documents"
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON public.documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON public.documents FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER set_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_grades_updated_at
  BEFORE UPDATE ON public.grades
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to calculate GPA
CREATE OR REPLACE FUNCTION public.calculate_gpa(p_user_id UUID)
RETURNS DECIMAL(3,2)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_points DECIMAL(10,2) := 0;
  total_credits DECIMAL(10,2) := 0;
  gpa_result DECIMAL(3,2);
BEGIN
  SELECT 
    COALESCE(SUM(
      CASE g.letter_grade
        WHEN 'A+' THEN 4.0 * c.credits
        WHEN 'A' THEN 4.0 * c.credits
        WHEN 'A-' THEN 3.7 * c.credits
        WHEN 'B+' THEN 3.3 * c.credits
        WHEN 'B' THEN 3.0 * c.credits
        WHEN 'B-' THEN 2.7 * c.credits
        WHEN 'C+' THEN 2.3 * c.credits
        WHEN 'C' THEN 2.0 * c.credits
        WHEN 'C-' THEN 1.7 * c.credits
        WHEN 'D+' THEN 1.3 * c.credits
        WHEN 'D' THEN 1.0 * c.credits
        WHEN 'F' THEN 0.0 * c.credits
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(
      CASE 
        WHEN g.letter_grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F')
        THEN c.credits
        ELSE 0
      END
    ), 0)
  INTO total_points, total_credits
  FROM public.grades g
  JOIN public.courses c ON g.course_id = c.id
  WHERE g.user_id = p_user_id
    AND g.letter_grade IS NOT NULL
    AND c.status = 'completed';
  
  IF total_credits > 0 THEN
    gpa_result := ROUND(total_points / total_credits, 2);
  ELSE
    gpa_result := 0.00;
  END IF;
  
  RETURN gpa_result;
END;
$$;

-- Function to calculate attendance percentage
CREATE OR REPLACE FUNCTION public.calculate_attendance_percentage(
  p_user_id UUID,
  p_course_id UUID DEFAULT NULL
)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_classes INTEGER;
  present_classes INTEGER;
  percentage DECIMAL(5,2);
BEGIN
  IF p_course_id IS NOT NULL THEN
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE status IN ('present', 'late'))
    INTO total_classes, present_classes
    FROM public.attendance
    WHERE user_id = p_user_id AND course_id = p_course_id;
  ELSE
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE status IN ('present', 'late'))
    INTO total_classes, present_classes
    FROM public.attendance
    WHERE user_id = p_user_id;
  END IF;
  
  IF total_classes > 0 THEN
    percentage := ROUND((present_classes::DECIMAL / total_classes::DECIMAL) * 100, 2);
  ELSE
    percentage := 0.00;
  END IF;
  
  RETURN percentage;
END;
$$;