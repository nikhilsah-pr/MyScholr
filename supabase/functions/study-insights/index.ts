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

    // Fetch academic standing
    const { data: standingData, error: standingError } = await supabaseClient
      .rpc('get_academic_standing', { p_user_id: user.id });

    if (standingError) throw standingError;

    // Fetch grade trends
    const { data: trendsData, error: trendsError } = await supabaseClient
      .rpc('get_grade_trends', { p_user_id: user.id, p_months: 6 });

    if (trendsError) throw trendsError;

    // Fetch attendance patterns
    const { data: attendanceData, error: attendanceError } = await supabaseClient
      .rpc('get_attendance_patterns', { p_user_id: user.id, p_months: 3 });

    if (attendanceError) throw attendanceError;

    const standing = standingData?.[0] || {};
    
    // Prepare context for AI
    const context = `
Student Academic Profile:
- GPA: ${standing.gpa || 0}
- Total Credits: ${standing.total_credits || 0}
- Completed Courses: ${standing.completed_courses || 0}
- Active Courses: ${standing.active_courses || 0}
- Attendance: ${standing.attendance_percentage || 0}%

Recent Grade Trends (Last 6 months):
${trendsData?.map((t: any) => `- ${t.month}: ${t.average_grade}% (${t.total_grades} grades)`).join('\n') || 'No recent grades'}

Attendance Patterns (Last 3 months):
${attendanceData?.map((a: any) => `- Week of ${a.week_start}: ${a.attendance_rate}% (${a.total_classes} classes)`).join('\n') || 'No attendance data'}
`;

    // Call Lovable AI for insights
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an academic advisor AI assistant. Provide concise, actionable study advice based on student data. Focus on specific recommendations for improving performance, attendance, and study habits. Keep responses under 150 words total, organized in 3 brief sections: Performance Analysis, Study Recommendations, and Action Items.'
          },
          {
            role: 'user',
            content: `Based on this student's academic data, provide personalized study insights:\n\n${context}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const insights = aiData.choices?.[0]?.message?.content || 'Unable to generate insights at this time.';

    return new Response(
      JSON.stringify({ 
        insights,
        academicStanding: standing,
        gradeTrends: trendsData,
        attendancePatterns: attendanceData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in study-insights function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
