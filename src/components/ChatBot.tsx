import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, Send, Bot, User, Loader2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatBotProps {
  subjectName: string;
  noteTitle?: string;
}

export function ChatBot({ subjectName, noteTitle }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Hi! I'm your study assistant. Ask me any doubts about ${subjectName}!` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Rate Limiting State
  const [isCooldown, setIsCooldown] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Close chatbot on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSend = async () => {
    // Prevent sending if empty, too long, or in cooldown
    if (!input.trim() || input.length > 2000 || isCooldown) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    
    // Start Cooldown
    setIsCooldown(true);
    
    // Reset cooldown after 5 seconds
    setTimeout(() => {
      setIsCooldown(false);
    }, 5000);

    try {
      // Send last 6 messages as conversation history for context
      const chatHistory = messages
        .filter(m => m.content !== `Hi! I'm your study assistant. Ask me any doubts about ${subjectName}!`)
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      // Get auth token for the edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to use the chatbot.');
        setIsLoading(false);
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // Add an empty assistant message that we'll stream into
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      const response = await fetch(`${supabaseUrl}/functions/v1/ask-groq`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          message: userMessage,
          context: `Subject: ${subjectName}${noteTitle ? `, Specific Topic: ${noteTitle}` : ''}`,
          history: chatHistory,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMsg = errorData?.reply || `Server error (${response.status})`;
        // Replace the empty assistant message with the error
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: errorMsg };
          return updated;
        });
        setIsLoading(false);
        return;
      }

      // Read the SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6); // Remove 'data: '
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              // Append new content to the last (assistant) message
              setMessages(prev => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                updated[updated.length - 1] = {
                  ...lastMsg,
                  content: lastMsg.content + content,
                };
                return updated;
              });
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }

      // If the assistant message ended up empty, provide a fallback
      setMessages(prev => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg.role === 'assistant' && !lastMsg.content.trim()) {
          updated[updated.length - 1] = {
            ...lastMsg,
            content: "I'm sorry, I couldn't generate a response. Please try again.",
          };
        }
        return updated;
      });

    } catch (error: unknown) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Chat error: ${errorMessage}`);
      // Replace the empty assistant message or add error message
      setMessages(prev => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg.role === 'assistant' && !lastMsg.content.trim()) {
          updated[updated.length - 1] = {
            ...lastMsg,
            content: `I'm having trouble connecting right now. Error: ${errorMessage}. Please try again later.`,
          };
        } else {
          updated.push({ role: 'assistant', content: `I'm having trouble connecting right now. Error: ${errorMessage}. Please try again later.` });
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none">
      {isOpen && (
        <div className="relative mb-4 pointer-events-auto flex justify-end w-full">
          {/* Gradient Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-secondary rounded-xl blur opacity-30 animate-pulse"></div>
          
          {/* MOBILE FIXES:
             1. w-[calc(100vw-2rem)]: Sets width to screen size minus 32px (margins)
             2. max-w-[350px]: Ensures it doesn't get too wide on tablets
             3. h-[60vh]: Limits height on mobile so keyboard doesn't hide header
             4. sm:h-[500px] & sm:w-[350px]: Restores standard size on desktop
          */}
          <Card className="relative w-[calc(100vw-2rem)] max-w-[350px] h-[60vh] sm:h-[500px] shadow-2xl flex flex-col border-primary/20 animate-in slide-in-from-bottom-5 fade-in duration-300 bg-background/95 backdrop-blur-sm">
            
            <CardHeader className="bg-primary text-primary-foreground py-3 px-4 rounded-t-lg flex flex-row items-center justify-between shrink-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Doubt Solver
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-primary-foreground hover:bg-primary-dark/50"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            
            <CardContent className="flex-1 p-0 flex flex-col overflow-hidden bg-transparent">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      
                      {/* TEXT WRAPPING FIX */}
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm break-words overflow-hidden ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground border border-border/50'
                        }`}
                      >
                        <ReactMarkdown
                          components={{
                            strong: (props) => <span className="font-bold" {...props} />,
                            ul: (props) => <ul className="list-disc pl-4 space-y-1 my-1" {...props} />,
                            ol: (props) => <ol className="list-decimal pl-4 space-y-1 my-1" {...props} />,
                            li: (props) => <li className="break-words" {...props} />,
                            p: (props) => <p className="mb-2 last:mb-0 leading-relaxed whitespace-pre-wrap break-words" {...props} />,
                            h1: (props) => <h1 className="font-bold text-lg mb-2 break-words" {...props} />,
                            h2: (props) => <h2 className="font-bold text-base mb-2 break-words" {...props} />,
                            h3: (props) => <h3 className="font-bold text-sm mb-1 break-words" {...props} />,
                            code: (props) => <code className="bg-black/10 px-1 rounded text-xs font-mono break-all whitespace-pre-wrap" {...props} />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>

                      {msg.role === 'user' && (
                        <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-secondary" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                    <div className="flex gap-2 justify-start">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                      <div className="bg-muted rounded-lg px-3 py-2 flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              <div className="p-4 border-t bg-background/50">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex gap-2"
                >
                  <Input
                    placeholder={isCooldown ? "Please wait 5s..." : "Ask a doubt..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading || isCooldown}
                    className="flex-1 bg-background"
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={isLoading || !input.trim() || isCooldown}
                    className={isCooldown ? "bg-muted text-muted-foreground" : ""}
                  >
                    {isCooldown ? (
                      <Clock className="h-4 w-4 animate-pulse" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Toggle Button */}
      <div className="relative group pointer-events-auto">
        <div className={`absolute -inset-1 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-500 ${isOpen ? 'bg-destructive' : 'bg-gradient-to-r from-primary to-accent'}`}></div>
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="lg"
          aria-label={isOpen ? 'Close AI chat assistant' : 'Open AI chat assistant'}
          className={`relative h-14 w-14 rounded-full shadow-lg transition-transform hover:scale-110 ${isOpen ? 'bg-destructive hover:bg-destructive/90' : 'bg-gradient-to-r from-primary to-accent'}`}
        >
          {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </Button>
      </div>
    </div>
  );
}