import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import bcrypt from 'bcryptjs';

interface Chat {
  id: string;
  title: string;
  created_at: string;
}

interface AppUser {
  id: string;
  username: string;
  display_name: string;
  created_at: string;
  active: boolean;
}

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const { currentUser, userType, logout } = useAuthStore();
  const { toast } = useToast();
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateChatOpen, setIsCreateChatOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    displayName: '',
    password: ''
  });
  const [newChatTitle, setNewChatTitle] = useState('');

  useEffect(() => {
    if (userType !== 'owner' || !currentUser) {
      navigate('/');
      return;
    }
    loadChats();
    loadUsers();
  }, [currentUser, userType, navigate]);

  const loadChats = async () => {
    const { data } = await supabase
      .from('chats')
      .select('*')
      .eq('owner_id', currentUser)
      .order('created_at', { ascending: false });
    
    if (data) setChats(data);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from('app_users')
      .select('*')
      .eq('owner_id', currentUser)
      .order('created_at', { ascending: false });
    
    if (data) setUsers(data);
  };

  // Ensure each girlfriend has a private 1:1 DM with the Owner
  const getOrCreateDm = async (userId: string, displayName?: string): Promise<string> => {
    const { data: existing } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', userId)
      .eq('role', 'girlfriend')
      .maybeSingle();

    if (existing?.chat_id) {
      return existing.chat_id as string;
    }

    const { data: chat, error: chatErr } = await supabase
      .from('chats')
      .insert([{ owner_id: currentUser, title: displayName || 'Direct Message' }])
      .select()
      .single();

    if (chatErr || !chat) {
      throw new Error('Failed to create chat');
    }

    // Add participants
    await supabase.from('chat_participants').insert([
      { chat_id: chat.id, owner_id: currentUser, role: 'owner' },
    ]);

    await supabase.from('chat_participants').insert([
      { chat_id: chat.id, user_id: userId, role: 'girlfriend' },
    ]);

    // Refresh chats list
    await loadChats();

    return chat.id as string;
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.displayName || !newUser.password) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive"
      });
      return;
    }

    try {
      const hashedPassword = await bcrypt.hash(newUser.password, 10);
      
      const { data: created, error } = await supabase
        .from('app_users')
        .insert([{
          owner_id: currentUser,
          username: newUser.username,
          display_name: newUser.displayName,
          password_hash: hashedPassword
        }])
        .select()
        .single();

      if (error || !created) {
        throw error || new Error('Failed to create user');
      }

      // Auto-create a private 1:1 DM with the owner
      await getOrCreateDm(created.id, created.display_name);

      toast({
        title: "Success",
        description: "User and private DM created"
      });

      setNewUser({ username: '', displayName: '', password: '' });
      setIsCreateUserOpen(false);
      await Promise.all([loadUsers(), loadChats()]);
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive"
      });
    }
  };

  const createChat = async () => {
    if (!newChatTitle) {
      toast({
        title: "Error",
        description: "Chat title is required",
        variant: "destructive"
      });
      return;
    }

    const { data: chat, error } = await supabase
      .from('chats')
      .insert([{
        owner_id: currentUser,
        title: newChatTitle
      }])
      .select()
      .single();

    if (error || !chat) {
      toast({
        title: "Error",
        description: "Failed to create chat",
        variant: "destructive"
      });
      return;
    }

    // Add owner as participant
    await supabase
      .from('chat_participants')
      .insert([{
        chat_id: chat.id,
        owner_id: currentUser,
        role: 'owner'
      }]);

    toast({
      title: "Success",
      description: "Chat created successfully"
    });

    setNewChatTitle('');
    setIsCreateChatOpen(false);
    loadChats();
  };

  const assignUserToChat = async (userId: string, chatId: string) => {
    const { error } = await supabase
      .from('chat_participants')
      .insert([{
        chat_id: chatId,
        user_id: userId,
        role: 'girlfriend'
      }]);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to assign user to chat",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "User assigned to chat"
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground">Owner Dashboard</h1>
          <Button onClick={logout} variant="outline">
            Logout
          </Button>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Chats</CardTitle>
                <Dialog open={isCreateChatOpen} onOpenChange={setIsCreateChatOpen}>
                  <DialogTrigger asChild>
                    <Button className="btn-glow">Create Chat</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Chat</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Chat title"
                        value={newChatTitle}
                        onChange={(e) => setNewChatTitle(e.target.value)}
                      />
                      <Button onClick={createChat} className="w-full">
                        Create Chat
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {chats.map((chat) => (
                    <motion.div
                      key={chat.id}
                      whileHover={{ scale: 1.02 }}
                      className="p-3 bg-muted rounded-lg cursor-pointer hover:bg-accent"
                      onClick={() => navigate(`/chat/${chat.id}`)}
                    >
                      <h3 className="font-medium">{chat.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(chat.created_at).toLocaleDateString()}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Users</CardTitle>
                <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                  <DialogTrigger asChild>
                    <Button className="btn-glow">Create User</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Username"
                        value={newUser.username}
                        onChange={(e) => setNewUser(prev => ({...prev, username: e.target.value}))}
                      />
                      <Input
                        placeholder="Display name"
                        value={newUser.displayName}
                        onChange={(e) => setNewUser(prev => ({...prev, displayName: e.target.value}))}
                      />
                      <Input
                        type="password"
                        placeholder="Temporary password"
                        value={newUser.password}
                        onChange={(e) => setNewUser(prev => ({...prev, password: e.target.value}))}
                      />
                      <Button onClick={createUser} className="w-full">
                        Create User
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.map((user) => (
                    <motion.div
                      key={user.id}
                      whileHover={{ scale: 1.02 }}
                      className="p-3 bg-muted rounded-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{user.display_name}</h3>
                          <p className="text-sm text-muted-foreground">@{user.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const chatId = await getOrCreateDm(user.id, user.display_name);
                              navigate(`/chat/${chatId}`);
                            }}
                          >
                            Open DM
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;