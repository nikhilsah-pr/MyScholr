import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { format = 'json' } = await req.json();

    // Fetch all user data
    const [profile, courses, grades, attendance, documents, calendar] = await Promise.all([
      supabaseClient.from('profiles').select('*').eq('id', user.id).single(),
      supabaseClient.from('courses').select('*').eq('user_id', user.id),
      supabaseClient.from('grades').select('*, courses(course_code, course_name)').eq('user_id', user.id),
      supabaseClient.from('attendance').select('*, courses(course_code, course_name)').eq('user_id', user.id),
      supabaseClient.from('documents').select('id, title, description, category, tags, created_at, course_id').eq('user_id', user.id),
      supabaseClient.from('calendar_events').select('*').eq('user_id', user.id),
    ]);

    const exportData = {
      profile: profile.data,
      courses: courses.data,
      grades: grades.data,
      attendance: attendance.data,
      documents: documents.data,
      calendar_events: calendar.data,
      exported_at: new Date().toISOString(),
    };

    if (format === 'csv') {
      // Convert to CSV format (simplified for courses as example)
      const csvData = [
        ['Course Code', 'Course Name', 'Credits', 'Status', 'Semester'],
        ...(courses.data || []).map(c => [
          c.course_code,
          c.course_name,
          c.credits,
          c.status,
          c.semester
        ])
      ].map(row => row.join(',')).join('\n');

      return new Response(csvData, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="academic-data.csv"'
        }
      });
    }

    // Default JSON format
    return new Response(
      JSON.stringify(exportData, null, 2),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="academic-data.json"'
        }
      }
    );

  } catch (error: any) {
    console.error('Error in export-data function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
