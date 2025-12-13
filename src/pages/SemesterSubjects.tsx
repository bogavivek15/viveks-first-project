import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Book } from 'lucide-react';
import { toast } from 'sonner';

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Course {
  name: string;
  short_name: string;
}

const SemesterSubjects = () => {
  const { courseId, year, semester } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (courseId && year && semester) {
      fetchCourseAndSubjects();
    }
  }, [courseId, year, semester]);

  const fetchCourseAndSubjects = async () => {
    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('name, short_name')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('course_id', courseId)
        .eq('year', parseInt(year!))
        .eq('semester', parseInt(semester!))
        .order('code');

      if (subjectsError) throw subjectsError;
      setSubjects(subjectsData || []);
    } catch (error: any) {
      toast.error('Failed to load subjects');
      console.error('Error fetching data:', error);
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
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/course/${courseId}/year/${year}`)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Semesters
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {course?.short_name} - {year}{yearSuffix} Year, Semester {semester}
            </h1>
            <p className="text-muted-foreground">Select a subject to view available notes</p>
          </div>

          {subjects.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject) => (
                <Card 
                  key={subject.id}
                  className="hover:border-primary transition-all cursor-pointer group"
                  onClick={() => navigate(`/course/${courseId}/year/${year}/semester/${semester}/subject/${subject.id}`)}
                >
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-secondary to-accent flex items-center justify-center mb-4">
                      <Book className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="group-hover:text-primary transition-colors">
                      {subject.code}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {subject.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start group-hover:bg-primary/10"
                    >
                      View Notes →
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Book className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Subjects Found</h3>
                <p className="text-muted-foreground">
                  No subjects have been added for this semester yet
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SemesterSubjects;