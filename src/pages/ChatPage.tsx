import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_type: 'owner' | 'girlfriend';
  created_at: string;
}

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  user_type: 'owner' | 'girlfriend';
  reaction_type: string;
}

const ChatPage = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { currentUser, userType, logout } = useAuthStore();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatTitle, setChatTitle] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser || !chatId) {
      navigate('/');
      return;
    }
    
    loadChat();
    loadMessages();
    loadReactions();
    subscribeToMessages();
    subscribeToReactions();
  }, [chatId, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChat = async () => {
    const { data } = await supabase
      .from('chats')
      .select('title')
      .eq('id', chatId)
      .single();
    
    if (data) setChatTitle(data.title);
  };

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data as Message[]);
  };

  const loadReactions = async () => {
    const { data } = await supabase
      .from('reactions')
      .select('*')
      .in('message_id', messages.map(m => m.id));
    
    if (data) setReactions(data as Reaction[]);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const subscribeToReactions = () => {
    const channel = supabase
      .channel('reactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setReactions(prev => [...prev, payload.new as Reaction]);
          } else if (payload.eventType === 'DELETE') {
            setReactions(prev => prev.filter(r => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const { error } = await supabase
      .from('messages')
      .insert([{
        chat_id: chatId,
        sender_id: currentUser,
        sender_type: userType,
        content: newMessage.trim()
      }]);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
      return;
    }

    setNewMessage('');
  };

  const addReaction = async (messageId: string, reactionType: string) => {
    // Check if user already reacted
    const existingReaction = reactions.find(
      r => r.message_id === messageId && r.user_id === currentUser && r.user_type === userType
    );

    if (existingReaction) {
      // Remove existing reaction
      await supabase
        .from('reactions')
        .delete()
        .eq('id', existingReaction.id);
    } else {
      // Add new reaction
      await supabase
        .from('reactions')
        .insert([{
          message_id: messageId,
          user_id: currentUser,
          user_type: userType,
          reaction_type: reactionType
        }]);
    }
  };

  const getMessageReactions = (messageId: string) => {
    return reactions.filter(r => r.message_id === messageId);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-4 bg-card border-b"
      >
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => navigate(userType === 'owner' ? '/owner' : '/')}
            variant="ghost"
            size="sm"
          >
            ← Back
          </Button>
          <h1 className="text-xl font-semibold">{chatTitle}</h1>
        </div>
        <Button onClick={logout} variant="outline" size="sm">
          Logout
        </Button>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
          const messageReactions = getMessageReactions(message.id);
          const isOwnMessage = message.sender_id === currentUser && message.sender_type === userType;
          
          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                <Card className={`p-3 ${
                  isOwnMessage 
                    ? 'bg-primary text-primary-foreground ml-auto' 
                    : 'bg-card'
                }`}>
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </p>
                  
                  {/* Reactions */}
                  <div className="flex items-center gap-1 mt-2">
                    {messageReactions.length > 0 && (
                      <div className="flex gap-1">
                        {Array.from(new Set(messageReactions.map(r => r.reaction_type))).map(type => (
                          <span key={type} className="text-xs bg-muted px-2 py-1 rounded-full">
                            {type} {messageReactions.filter(r => r.reaction_type === type).length}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Reaction buttons */}
                    <div className="flex gap-1 ml-2">
                      {['❤️', '👍', '😂'].map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => addReaction(message.id, emoji)}
                          className="text-xs hover:scale-125 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-card border-t"
      >
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            className="btn-glow"
            disabled={!newMessage.trim()}
          >
            Send
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default ChatPage;