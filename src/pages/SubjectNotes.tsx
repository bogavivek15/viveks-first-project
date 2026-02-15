import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, FileText, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { ChatBot } from '@/components/ChatBot';
import { PageMeta } from '@/components/PageMeta';

interface Note {
  id: string;
  title: string;
  description: string | null;
  resource_type: 'notes' | 'question_papers';
  exam_type: string;
  file_url: string;
  file_name: string;
  created_at: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SubjectNotes = () => {
  const { courseId, year, semester, subjectId } = useParams();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Validate UUID params before querying
    if (!subjectId || !UUID_RE.test(subjectId)) {
      navigate('/dashboard');
      return;
    }
    let isMounted = true;

    const fetchSubjectAndNotes = async () => {
      if (!subjectId) {
        if (isMounted) setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const { data: subjectData, error: subjectError } = await supabase
          .from('subjects')
          .select('id, name, code')
          .eq('id', subjectId)
          .single();

        if (subjectError) throw subjectError;

        const { data: notesData, error: notesError } = await supabase
          .from('notes')
          .select('*')
          .eq('subject_id', subjectId)
          .order('created_at', { ascending: false });

        if (notesError) throw notesError;

        if (isMounted) {
          setSubject(subjectData);
          setNotes(notesData || []);
        }
      } catch (error) {
        if (isMounted) {
          toast.error('Failed to load notes');
          console.error('Error fetching data:', error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSubjectAndNotes();

    return () => {
      isMounted = false;
    };
  }, [subjectId]);

  const handleDownload = async (fileUrl: string, fileName: string) => {
    // Validate download URL origin — only allow Supabase storage URLs
    try {
      const url = new URL(fileUrl);
      if (!url.hostname.endsWith('.supabase.co') && !url.hostname.endsWith('.supabase.in')) {
        toast.error('Invalid download URL');
        return;
      }
    } catch {
      toast.error('Invalid download URL');
      return;
    }

    const toastId = toast.loading('Starting download...');
    
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.dismiss(toastId);
      toast.success('Download started!');
    } catch (error) {
      console.error('Download error:', error);
      toast.dismiss(toastId);
      toast.error('Download failed. Opening in new tab instead.');
      window.open(fileUrl, '_blank');
    }
  };

  const handleView = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  const getExamTypeBadge = (examType: string) => {
    if (!examType) return <Badge variant="outline">Unknown</Badge>;

    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      regular: 'default',
      supply: 'secondary',
      both: 'outline',
    };
    
    const variant = variants[examType] || 'outline';
    
    return (
      <Badge variant={variant}>
        {examType === 'both' 
          ? 'Regular & Supply' 
          : examType.charAt(0).toUpperCase() + examType.slice(1)}
      </Badge>
    );
  };

  const getResourceTypeBadge = (resourceType: 'notes' | 'question_papers') => {
    return (
      <Badge variant="default" className="bg-primary">
        {resourceType === 'notes' ? 'Study Notes' : 'Question Paper'}
      </Badge>
    );
  };

  const studyNotes = notes.filter(note => note.resource_type === 'notes');
  const questionPapers = notes.filter(note => note.resource_type === 'question_papers');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <PageMeta title={subject ? subject.name : 'Notes'} />
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/course/${courseId}/year/${year}/semester/${semester}`)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Subjects
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {subject?.code} - {subject?.name}
            </h1>
            <p className="text-muted-foreground">Download notes, question papers, and study materials</p>
          </div>

          {notes.length > 0 ? (
            <div className="space-y-8">
              {/* Study Notes Section */}
              {studyNotes.length > 0 && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-6 w-6 text-primary" />
                    Study Notes
                  </h2>
                  <div className="space-y-4">
                    {studyNotes.map((note) => (
                      <Card key={note.id} className="hover:border-primary transition-colors">
                        <CardHeader>
                          {/* RESPONSIVE LAYOUT FIX HERE */}
                          <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                            <div className="flex gap-4 flex-1 w-full">
                              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                                <FileText className="h-6 w-6 text-primary-foreground" />
                              </div>
                              <div className="flex-1">
                                <CardTitle className="mb-2">{note.title}</CardTitle>
                                <CardDescription className="mb-3">
                                  {note.description || 'No description available'}
                                </CardDescription>
                                <div className="flex gap-2 flex-wrap">
                                  {getResourceTypeBadge(note.resource_type)}
                                  {getExamTypeBadge(note.exam_type)}
                                  <Badge variant="outline" className="text-xs">
                                    {new Date(note.created_at).toLocaleDateString()}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            {/* Buttons stack on mobile, align right on desktop */}
                            <div className="flex flex-row w-full md:w-auto gap-2 mt-2 md:mt-0 md:ml-4">
                              <Button
                                variant="outline"
                                onClick={() => handleView(note.file_url)}
                                className="flex-1 md:flex-none gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </Button>
                              <Button
                                onClick={() => handleDownload(note.file_url, note.file_name)}
                                className="flex-1 md:flex-none bg-gradient-to-r from-secondary to-secondary/90 gap-2"
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Question Papers Section */}
              {questionPapers.length > 0 && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-6 w-6 text-secondary" />
                    Previous Year Question Papers
                  </h2>
                  <div className="space-y-4">
                    {questionPapers.map((note) => (
                      <Card key={note.id} className="hover:border-secondary transition-colors">
                        <CardHeader>
                          {/* RESPONSIVE LAYOUT FIX HERE */}
                          <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                            <div className="flex gap-4 flex-1 w-full">
                              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-secondary to-accent flex items-center justify-center flex-shrink-0">
                                <FileText className="h-6 w-6 text-secondary-foreground" />
                              </div>
                              <div className="flex-1">
                                <CardTitle className="mb-2">{note.title}</CardTitle>
                                <CardDescription className="mb-3">
                                  {note.description || 'No description available'}
                                </CardDescription>
                                <div className="flex gap-2 flex-wrap">
                                  {getResourceTypeBadge(note.resource_type)}
                                  {getExamTypeBadge(note.exam_type)}
                                  <Badge variant="outline" className="text-xs">
                                    {new Date(note.created_at).toLocaleDateString()}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {/* Buttons stack on mobile, align right on desktop */}
                            <div className="flex flex-row w-full md:w-auto gap-2 mt-2 md:mt-0 md:ml-4">
                              <Button
                                variant="outline"
                                onClick={() => handleView(note.file_url)}
                                className="flex-1 md:flex-none gap-2 hover:bg-secondary/10 hover:text-secondary border-secondary/20"
                              >
                                <Eye className="h-4 w-4" />
                                View
                              </Button>
                              <Button
                                onClick={() => handleDownload(note.file_url, note.file_name)}
                                className="flex-1 md:flex-none bg-gradient-to-r from-secondary to-secondary/90 gap-2"
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Materials Available</h3>
                <p className="text-muted-foreground">
                  Study materials for this subject haven't been uploaded yet. Check back soon!
                </p>
              </CardContent>
            </Card>
          )}

          {subject && (
            <ChatBot 
              key={subject.id}
              subjectName={subject.name} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SubjectNotes;