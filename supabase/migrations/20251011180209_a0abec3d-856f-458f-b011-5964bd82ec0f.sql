-- Security hardening: Fix function search paths
-- Update all functions to use explicit search_path

-- Fix calculate_gpa function
CREATE OR REPLACE FUNCTION public.calculate_gpa(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

-- Fix calculate_attendance_percentage function
CREATE OR REPLACE FUNCTION public.calculate_attendance_percentage(p_user_id uuid, p_course_id uuid DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

-- Fix update_document_search_vector function
CREATE OR REPLACE FUNCTION public.update_document_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$function$;

-- Fix search_documents function
CREATE OR REPLACE FUNCTION public.search_documents(p_user_id uuid, p_query text)
RETURNS TABLE(id uuid, title text, description text, file_url text, category text, rank real)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

-- Fix has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'student');
  
  RETURN new;
END;
$function$;

-- Fix handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix get_grade_trends function
CREATE OR REPLACE FUNCTION public.get_grade_trends(p_user_id uuid, p_months integer DEFAULT 6)
RETURNS TABLE(month text, average_grade numeric, total_grades integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

-- Fix get_attendance_patterns function
CREATE OR REPLACE FUNCTION public.get_attendance_patterns(p_user_id uuid, p_months integer DEFAULT 3)
RETURNS TABLE(week_start date, attendance_rate numeric, total_classes integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

-- Fix get_academic_standing function
CREATE OR REPLACE FUNCTION public.get_academic_standing(p_user_id uuid)
RETURNS TABLE(gpa numeric, total_credits numeric, completed_courses integer, active_courses integer, attendance_percentage numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_gpa numeric;
  v_attendance numeric;
BEGIN
  SELECT public.calculate_gpa(p_user_id) INTO v_gpa;
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
$function$;