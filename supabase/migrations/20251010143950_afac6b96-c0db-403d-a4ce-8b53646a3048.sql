-- Analytics functions for performance tracking
CREATE OR REPLACE FUNCTION public.get_grade_trends(p_user_id uuid, p_months integer DEFAULT 6)
RETURNS TABLE(
  month text,
  average_grade numeric,
  total_grades integer
) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(g.date_received, 'YYYY-MM') as month,
    ROUND(AVG(g.grade_value / NULLIF(g.max_value, 0) * 100), 2) as average_grade,
    COUNT(*)::integer as total_grades
  FROM public.grades g
  WHERE g.user_id = p_user_id
    AND g.date_received >= NOW() - (p_months || ' months')::INTERVAL
    AND g.grade_value IS NOT NULL
    AND g.max_value IS NOT NULL
  GROUP BY TO_CHAR(g.date_received, 'YYYY-MM')
  ORDER BY month DESC;
END;
$$;

-- Function to get attendance patterns
CREATE OR REPLACE FUNCTION public.get_attendance_patterns(p_user_id uuid, p_months integer DEFAULT 3)
RETURNS TABLE(
  week_start date,
  attendance_rate numeric,
  total_classes integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('week', a.date)::date as week_start,
    ROUND((COUNT(*) FILTER (WHERE a.status IN ('present', 'late'))::numeric / COUNT(*)::numeric) * 100, 2) as attendance_rate,
    COUNT(*)::integer as total_classes
  FROM public.attendance a
  WHERE a.user_id = p_user_id
    AND a.date >= NOW() - (p_months || ' months')::INTERVAL
  GROUP BY DATE_TRUNC('week', a.date)
  ORDER BY week_start DESC;
END;
$$;

-- Function to get academic standing
CREATE OR REPLACE FUNCTION public.get_academic_standing(p_user_id uuid)
RETURNS TABLE(
  gpa numeric,
  total_credits numeric,
  completed_courses integer,
  active_courses integer,
  attendance_percentage numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_gpa numeric;
  v_attendance numeric;
BEGIN
  -- Get GPA
  SELECT public.calculate_gpa(p_user_id) INTO v_gpa;
  
  -- Get attendance
  SELECT public.calculate_attendance_percentage(p_user_id) INTO v_attendance;
  
  RETURN QUERY
  SELECT 
    v_gpa as gpa,
    COALESCE(SUM(c.credits) FILTER (WHERE c.status = 'completed'), 0) as total_credits,
    COUNT(*) FILTER (WHERE c.status = 'completed')::integer as completed_courses,
    COUNT(*) FILTER (WHERE c.status = 'active')::integer as active_courses,
    v_attendance as attendance_percentage
  FROM public.courses c
  WHERE c.user_id = p_user_id;
END;
$$;

-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_grades_user_date ON public.grades(user_id, date_received DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_courses_user_status ON public.courses(user_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_user_category ON public.documents(user_id, category);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date ON public.calendar_events(user_id, event_date);
CREATE INDEX IF NOT EXISTS idx_schedules_course_day ON public.schedules(course_id, day_of_week);

-- Full-text search for documents
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_documents_search ON public.documents USING GIN(search_vector);

-- Trigger to update search vector
CREATE OR REPLACE FUNCTION public.update_document_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_document_search_vector
BEFORE INSERT OR UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_document_search_vector();

-- Update existing documents
UPDATE public.documents SET updated_at = updated_at;

-- Function for document search
CREATE OR REPLACE FUNCTION public.search_documents(p_user_id uuid, p_query text)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  file_url text,
  category text,
  rank real
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    d.description,
    d.file_url,
    d.category,
    ts_rank(d.search_vector, websearch_to_tsquery('english', p_query)) as rank
  FROM public.documents d
  WHERE d.user_id = p_user_id
    AND d.search_vector @@ websearch_to_tsquery('english', p_query)
  ORDER BY rank DESC
  LIMIT 50;
END;
$$;