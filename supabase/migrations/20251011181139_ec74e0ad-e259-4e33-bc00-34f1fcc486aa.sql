-- Fix 1: Block anonymous access to profiles table
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- Fix 2: Add database constraints for document tags
ALTER TABLE public.documents 
ADD CONSTRAINT tags_array_size 
CHECK (array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 20);

-- Use a trigger for tag length validation since CHECK constraints can't use subqueries
CREATE OR REPLACE FUNCTION public.validate_document_tags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Check if any tag exceeds 50 characters
  IF NEW.tags IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM unnest(NEW.tags) AS tag WHERE length(tag) > 50) THEN
      RAISE EXCEPTION 'Each tag must be 50 characters or less';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_document_tags_trigger
BEFORE INSERT OR UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.validate_document_tags();