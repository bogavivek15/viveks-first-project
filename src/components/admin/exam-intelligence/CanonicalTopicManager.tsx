import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BookOpen, Plus, Trash2, Tag, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export interface CanonicalTopic {
  id: string;
  subject_id: string;
  unit_number: number;
  topic_name: string;
  aliases: string[];
}

interface CanonicalTopicManagerProps {
  subjectId: string;
  subjectName: string;
  onTopicsUpdated?: (topics: CanonicalTopic[]) => void;
}

export function CanonicalTopicManager({ subjectId, subjectName, onTopicsUpdated }: CanonicalTopicManagerProps) {
  const [topics, setTopics] = useState<CanonicalTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newTopicName, setNewTopicName] = useState('');
  const [newUnitNumber, setNewUnitNumber] = useState('1');
  const [newAliases, setNewAliases] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (subjectId) {
      fetchTopics();
    }
  }, [subjectId]);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('canonical_topics')
        .select('*')
        .eq('subject_id', subjectId)
        .order('unit_number', { ascending: true })
        .order('topic_name', { ascending: true });

      if (error) throw error;
      const loaded = data || [];
      setTopics(loaded);
      onTopicsUpdated?.(loaded);
    } catch (err: any) {
      console.error('Failed to load canonical topics:', err);
      toast.error('Failed to load canonical topics');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTopic = async () => {
    if (!newTopicName.trim()) {
      toast.error('Please provide a topic name');
      return;
    }

    try {
      setSaving(true);
      const parsedAliases = newAliases
        .split(',')
        .map((a) => a.trim().toLowerCase())
        .filter((a) => a.length > 0);

      const { data, error } = await supabase
        .from('canonical_topics')
        .insert({
          subject_id: subjectId,
          unit_number: parseInt(newUnitNumber),
          topic_name: newTopicName.trim(),
          aliases: parsedAliases,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Canonical topic "${newTopicName.trim()}" added to Unit ${newUnitNumber}`);
      setNewTopicName('');
      setNewAliases('');
      setIsAddModalOpen(false);
      fetchTopics();
    } catch (err: any) {
      console.error('Error creating canonical topic:', err);
      if (err.code === '23505') {
        toast.error('A topic with this name already exists in this subject.');
      } else {
        toast.error(`Failed to add topic: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTopic = async (topicId: string, name: string) => {
    try {
      const { error } = await supabase
        .from('canonical_topics')
        .delete()
        .eq('id', topicId);

      if (error) throw error;
      toast.success(`Deleted topic "${name}"`);
      fetchTopics();
    } catch (err: any) {
      console.error('Delete topic error:', err);
      toast.error('Failed to delete topic');
    }
  };

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Syllabus Canonical Topics ({subjectName})
            </CardTitle>
            <CardDescription>
              Defines authoritative syllabus topics to group varied examination questions under a single concept.
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} size="sm" className="gap-1.5 self-start sm:self-auto">
            <Plus className="h-4 w-4" /> Add Topic
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading syllabus topics...
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-lg bg-muted/20">
            <Tag className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
            <p className="text-sm font-medium">No canonical topics defined yet</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-4">
              Add syllabus topics so that questions extracted by Vision AI can be automatically grouped into canonical concepts.
            </p>
            <Button size="sm" variant="outline" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add First Topic
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((unit) => {
              const unitTopics = topics.filter((t) => t.unit_number === unit);
              if (unitTopics.length === 0) return null;

              return (
                <div key={unit} className="border rounded-lg p-3 bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Unit {unit}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {unitTopics.length} topic{unitTopics.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {unitTopics.map((topic) => (
                      <div
                        key={topic.id}
                        className="flex items-start justify-between gap-2 p-2 rounded bg-muted/40 border text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-foreground">{topic.topic_name}</p>
                          {topic.aliases && topic.aliases.length > 0 && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              Aliases: {topic.aliases.join(', ')}
                            </p>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteTopic(topic.id, topic.topic_name)}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                          title="Delete canonical topic"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Add Topic Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Syllabus Canonical Topic</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-unit">Syllabus Unit</Label>
              <Select value={newUnitNumber} onValueChange={setNewUnitNumber}>
                <SelectTrigger id="new-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Unit 1</SelectItem>
                  <SelectItem value="2">Unit 2</SelectItem>
                  <SelectItem value="3">Unit 3</SelectItem>
                  <SelectItem value="4">Unit 4</SelectItem>
                  <SelectItem value="5">Unit 5</SelectItem>
                  <SelectItem value="6">Unit 6</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-name">Canonical Topic Name</Label>
              <Input
                id="new-name"
                placeholder="e.g. AVL Trees, Graph Traversal, Hashing"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-aliases">Aliases / Common Phrasings (Comma-separated)</Label>
              <Input
                id="new-aliases"
                placeholder="e.g. avl rotations, avl balancing, height balanced tree"
                value={newAliases}
                onChange={(e) => setNewAliases(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Questions mentioning these phrases will automatically map to this topic.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTopic} disabled={saving || !newTopicName.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save Canonical Topic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
