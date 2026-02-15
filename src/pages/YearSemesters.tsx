import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, BookMarked } from 'lucide-react';
import { toast } from 'sonner';
import { PageMeta } from '@/components/PageMeta';

interface Course {
  name: string;
  short_name: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_YEARS = ['1', '2', '3', '4'];

const YearSemesters = () => {
  const { courseId, year } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const semesters = [1, 2];

  useEffect(() => {
    if (!courseId || !UUID_RE.test(courseId) || !year || !VALID_YEARS.includes(year)) {
      navigate('/dashboard');
      return;
    }
    fetchCourse();
  }, [courseId, year]);

  const fetchCourse = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('name, short_name')
        .eq('id', courseId!)
        .single();

      if (error) throw error;
      setCourse(data);
    } catch (error) {
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

  const yearSuffix = year === '1' ? 'st' : year === '2' ? 'nd' : year === '3' ? 'rd' : 'th';

  return (
    <div className="min-h-screen py-12">
      <PageMeta title={course ? `${course.short_name} - Year ${year}` : 'Semesters'} />
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/course/${courseId}`)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Years
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {course?.short_name} - {year}{yearSuffix} Year
            </h1>
            <p className="text-muted-foreground">Select semester to view subjects</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {semesters.map((semester) => (
              <Card 
                key={semester}
                className="hover:border-primary transition-all cursor-pointer group"
                onClick={() => navigate(`/course/${courseId}/year/${year}/semester/${semester}`)}
              >
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-accent to-primary flex items-center justify-center mb-4">
                    <BookMarked className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    Semester {semester}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start group-hover:bg-primary/10"
                  >
                    View Subjects →
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

export default YearSemesters;