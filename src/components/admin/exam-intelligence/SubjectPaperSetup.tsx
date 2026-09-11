import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Layers, ArrowRight } from 'lucide-react';

export interface SetupConfiguration {
  courseId: string;
  courseName: string;
  year: number;
  semester: number;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  examType: 'regular' | 'supply' | 'both';
  paperCount: number;
}

interface Course {
  id: string;
  name: string;
  short_name: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  course_id: string;
  year: number;
  semester: number;
}

interface SubjectPaperSetupProps {
  onConfigure: (config: SetupConfiguration) => void;
  initialConfig?: SetupConfiguration | null;
  disabled?: boolean;
}

export function SubjectPaperSetup({ onConfigure, initialConfig, disabled }: SubjectPaperSetupProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);

  const [courseId, setCourseId] = useState<string>(initialConfig?.courseId || '');
  const [year, setYear] = useState<string>(initialConfig ? String(initialConfig.year) : '');
  const [semester, setSemester] = useState<string>(initialConfig ? String(initialConfig.semester) : '');
  const [subjectId, setSubjectId] = useState<string>(initialConfig?.subjectId || '');
  const [examType, setExamType] = useState<'regular' | 'supply' | 'both'>(initialConfig?.examType || 'regular');
  const [paperCount, setPaperCount] = useState<string>(initialConfig ? String(initialConfig.paperCount) : '4');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      setLoading(true);
      const [coursesRes, subjectsRes] = await Promise.all([
        supabase.from('courses').select('id, name, short_name').order('short_name'),
        supabase.from('subjects').select('id, name, code, course_id, year, semester').order('name'),
      ]);

      if (coursesRes.error) throw coursesRes.error;
      if (subjectsRes.error) throw subjectsRes.error;

      setCourses(coursesRes.data || []);
      setSubjects(subjectsRes.data || []);
    } catch (err: any) {
      console.error('Failed to load academic catalog:', err);
      toast.error('Failed to load courses and subjects');
    } finally {
      setLoading(false);
    }
  };

  // Filter subjects whenever course, year, or semester changes
  useEffect(() => {
    if (courseId && year && semester) {
      const filtered = subjects.filter(
        (s) =>
          s.course_id === courseId &&
          s.year === parseInt(year) &&
          s.semester === parseInt(semester)
      );
      setFilteredSubjects(filtered);
      if (!filtered.some((s) => s.id === subjectId)) {
        setSubjectId('');
      }
    } else {
      setFilteredSubjects([]);
      setSubjectId('');
    }
  }, [courseId, year, semester, subjects]);

  const handleApply = () => {
    if (!courseId) {
      toast.error('Please select a Course / Branch');
      return;
    }
    if (!year) {
      toast.error('Please select an Academic Year');
      return;
    }
    if (!semester) {
      toast.error('Please select a Semester');
      return;
    }
    if (!subjectId) {
      toast.error('Please select a Subject');
      return;
    }

    const selectedCourse = courses.find((c) => c.id === courseId);
    const selectedSubject = subjects.find((s) => s.id === subjectId);

    if (!selectedCourse || !selectedSubject) {
      toast.error('Invalid subject configuration');
      return;
    }

    onConfigure({
      courseId,
      courseName: `${selectedCourse.short_name} - ${selectedCourse.name}`,
      year: parseInt(year),
      semester: parseInt(semester),
      subjectId,
      subjectName: selectedSubject.name,
      subjectCode: selectedSubject.code,
      examType,
      paperCount: parseInt(paperCount),
    });
  };

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Academic Target & Historical Scope</CardTitle>
            <CardDescription>
              Select the subject and choose how many previous examination papers to analyze together.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Course Selection */}
          <div className="space-y-2">
            <Label htmlFor="course-select">Course / Branch</Label>
            <Select value={courseId} onValueChange={setCourseId} disabled={disabled || loading}>
              <SelectTrigger id="course-select">
                <SelectValue placeholder={loading ? 'Loading courses...' : 'Select Course'} />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.short_name} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year Selection */}
          <div className="space-y-2">
            <Label htmlFor="year-select">Year</Label>
            <Select value={year} onValueChange={setYear} disabled={disabled || !courseId}>
              <SelectTrigger id="year-select">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1st Year</SelectItem>
                <SelectItem value="2">2nd Year</SelectItem>
                <SelectItem value="3">3rd Year</SelectItem>
                <SelectItem value="4">4th Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Semester Selection */}
          <div className="space-y-2">
            <Label htmlFor="semester-select">Semester</Label>
            <Select value={semester} onValueChange={setSemester} disabled={disabled || !year}>
              <SelectTrigger id="semester-select">
                <SelectValue placeholder="Select Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Semester 1</SelectItem>
                <SelectItem value="2">Semester 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Subject Selection */}
          <div className="space-y-2">
            <Label htmlFor="subject-select">Subject</Label>
            <Select
              value={subjectId}
              onValueChange={setSubjectId}
              disabled={disabled || filteredSubjects.length === 0}
            >
              <SelectTrigger id="subject-select">
                <SelectValue
                  placeholder={
                    !year || !semester
                      ? 'Select year & semester first'
                      : filteredSubjects.length === 0
                      ? 'No subjects found'
                      : 'Select Subject'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredSubjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Exam Type */}
          <div className="space-y-2">
            <Label htmlFor="exam-type-select">Exam Type</Label>
            <Select
              value={examType}
              onValueChange={(val: 'regular' | 'supply' | 'both') => setExamType(val)}
              disabled={disabled}
            >
              <SelectTrigger id="exam-type-select">
                <SelectValue placeholder="Exam Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular Examination</SelectItem>
                <SelectItem value="supply">Supplementary Examination</SelectItem>
                <SelectItem value="both">Combined (Regular & Supply)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Number of Historical Papers */}
          <div className="space-y-2">
            <Label htmlFor="paper-count-select">Number of Previous Papers</Label>
            <Select value={paperCount} onValueChange={setPaperCount} disabled={disabled}>
              <SelectTrigger id="paper-count-select">
                <SelectValue placeholder="Paper Count" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Historical Papers (Minimum)</SelectItem>
                <SelectItem value="3">3 Historical Papers (Recommended)</SelectItem>
                <SelectItem value="4">4 Historical Papers (High Basis)</SelectItem>
                <SelectItem value="5">5 Historical Papers (Optimal)</SelectItem>
                <SelectItem value="6">6 Historical Papers (Maximum)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleApply} disabled={disabled || !subjectId} className="gap-2">
            <Layers className="h-4 w-4" />
            Generate {paperCount} Paper Collection Cards
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
