import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, MailOpen, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const PAGE_SIZE = 20;

const ManageMessagesTab = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchMessages();
  }, [page]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const { data, error, count } = await supabase
        .from('contact_messages')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      setMessages(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const toggleReadStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ is_read: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setMessages(messages.map(msg => 
        msg.id === id ? { ...msg, is_read: !currentStatus } : msg
      ));

      toast.success(`Message marked as ${!currentStatus ? 'read' : 'unread'}`);
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('Failed to update message status');
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessages(messages.filter(msg => msg.id !== id));
      toast.success('Message deleted successfully');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  const unreadCount = messages.filter(msg => !msg.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Contact Messages</h3>
          <p className="text-sm text-muted-foreground">
            Manage messages from the contact form
          </p>
        </div>
        {unreadCount > 0 && (
          <Badge variant="secondary" className="text-sm">
            {unreadCount} unread
          </Badge>
        )}
      </div>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">No messages yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <Card key={message.id} className={!message.is_read ? 'border-primary/50' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{message.name}</CardTitle>
                      {!message.is_read && (
                        <Badge variant="default" className="text-xs">New</Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <span>{message.email}</span>
                      <span>•</span>
                      <span>{new Date(message.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleReadStatus(message.id, message.is_read)}
                      title={message.is_read ? 'Mark as unread' : 'Mark as read'}
                    >
                      {message.is_read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDeleteId(message.id)}
                      title="Delete message"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{message.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMessage(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pagination Controls */}
      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={(page + 1) * PAGE_SIZE >= totalCount}
              onClick={() => setPage(p => p + 1)}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageMessagesTab;
