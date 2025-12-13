import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadNotesTab } from '@/components/admin/UploadNotesTab';
import { ManageSubjectsTab } from '@/components/admin/ManageSubjectsTab';
import { ManageCoursesTab } from '@/components/admin/ManageCoursesTab';
import ManageMessagesTab from '@/components/admin/ManageMessagesTab';

const AdminPanel = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/dashboard');
    }
  }, [user, isAdmin, loading, navigate]);

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
        <div className="max-w-6xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <h1 className="text-3xl md:text-4xl font-bold mb-2">Admin Panel</h1>
          <p className="text-muted-foreground mb-8">Manage notes, subjects, and courses</p>

          <Tabs defaultValue="notes" className="space-y-6">
            <TabsList>
              <TabsTrigger value="notes">Upload Notes</TabsTrigger>
              <TabsTrigger value="subjects">Manage Subjects</TabsTrigger>
              <TabsTrigger value="courses">Manage Courses</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
            </TabsList>

            <TabsContent value="notes">
              <UploadNotesTab />
            </TabsContent>

            <TabsContent value="subjects">
              <ManageSubjectsTab />
            </TabsContent>

            <TabsContent value="courses">
              <ManageCoursesTab />
            </TabsContent>

            <TabsContent value="messages">
              <ManageMessagesTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;