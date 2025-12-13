import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, GraduationCap, ArrowRight, Upload, Search, Book } from 'lucide-react';
import { toast } from 'sonner';

interface Course {
  id: string;
  name: string;
  short_name: string;
  description: string | null;
}

interface SearchResult {
  id: string;
  name: string;
  code: string;
  course_id: string;
  year: number;
  semester: number;
  courses: {
    short_name: string;
  } | null;
}

const Dashboard = () => {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user]);

  useEffect(() => {
    const handleSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('subjects')
          .select('*, courses(short_name)')
          .or(`name.ilike.%${searchQuery}%,code.ilike.%${searchQuery}%`)
          .limit(5);

        if (error) throw error;
        setSearchResults((data as any) || []);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(handleSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('short_name');

      if (error) throw error;
      setCourses(data || []);
    } catch (error: any) {
      toast.error('Failed to load courses');
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Welcome back! 👋
            </h1>
            <p className="text-muted-foreground">Select your course or search for a subject</p>
          </div>

          {/* Search Bar Section with Gradient Lighting */}
          <div className="mb-10 relative group z-20">
            {/* The Gradient Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-secondary rounded-lg blur opacity-25 group-hover:opacity-60 transition duration-500"></div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 z-10" />
              <Input
                className="pl-10 h-12 text-lg bg-background border-2 border-transparent focus:border-primary/20 transition-all duration-300 placeholder:text-muted-foreground/50"
                placeholder="Search for subjects (e.g., 'Data Structures' or 'DS')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Search Results Dropdown */}
            {(searchResults.length > 0 || (searchQuery && !isSearching && searchResults.length === 0)) && (
              <Card className="absolute w-full z-50 mt-2 max-h-96 overflow-y-auto border-2 border-primary/20 shadow-xl animate-in fade-in zoom-in-95">
                <CardContent className="p-2">
                  {searchResults.length > 0 ? (
                    searchResults.map((subject) => (
                      <div
                        key={subject.id}
                        className="flex items-center justify-between p-3 hover:bg-accent/50 rounded-md cursor-pointer transition-colors group"
                        onClick={() => navigate(`/course/${subject.course_id}/year/${subject.year}/semester/${subject.semester}/subject/${subject.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-2 rounded-md group-hover:bg-primary/20 transition-colors">
                            <Book className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{subject.name} <span className="text-muted-foreground text-sm">({subject.code})</span></p>
                            <p className="text-sm text-muted-foreground">
                              {subject.courses?.short_name} • Year {subject.year} • Sem {subject.semester}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      No subjects found matching "{searchQuery}"
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {isAdmin && (
            <Card className="mb-8 border-2 border-secondary/50 bg-gradient-to-r from-secondary/10 to-accent/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-full bg-secondary/20 flex items-center justify-center">
                      <Upload className="h-6 w-6 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Admin Access</h3>
                      <p className="text-sm text-muted-foreground">
                        You have permission to upload and manage notes
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => navigate('/admin')} 
                    className="bg-gradient-to-r from-secondary to-secondary/90"
                  >
                    Admin Panel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card 
                key={course.id} 
                className="hover:border-primary transition-all cursor-pointer group"
                onClick={() => navigate(`/course/${course.id}`)}
              >
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center mb-4">
                    <GraduationCap className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {course.short_name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {course.description || course.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between group-hover:bg-primary/10"
                  >
                    View Materials
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {courses.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Courses Available</h3>
                <p className="text-muted-foreground">
                  Courses will appear here once they are added to the system
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;