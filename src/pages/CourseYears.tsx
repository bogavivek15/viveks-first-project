import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface Course {
  name: string;
  short_name: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CourseYears = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const years = [1, 2, 3, 4];

  useEffect(() => {
    if (!courseId || !UUID_RE.test(courseId)) {
      navigate('/dashboard');
      return;
    }
    fetchCourse();
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('name, short_name')
        .eq('id', courseId)
        .single();

      if (error) throw error;
      setCourse(data);
    } catch (error: any) {
      toast.error('Failed to load course');
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {course?.name}
            </h1>
            <p className="text-muted-foreground">Select your academic year</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {years.map((year) => (
              <Card 
                key={year}
                className="hover:border-primary transition-all cursor-pointer group"
                onClick={() => navigate(`/course/${courseId}/year/${year}`)}
              >
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                    <Calendar className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {year === 1 ? '1st' : year === 2 ? '2nd' : year === 3 ? '3rd' : '4th'} Year
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start group-hover:bg-primary/10"
                  >
                    View Semesters →
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseYears;