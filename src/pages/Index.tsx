import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import LockScreen from '@/components/LockScreen';
import UserSelection from '@/components/UserSelection';
import PasswordPrompt from '@/components/auth/PasswordPrompt';
import { supabase } from '@/integrations/supabase/client';
import bcrypt from 'bcryptjs';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();
  const { isLocked, login } = useAuthStore();
  const [showOwnerAuth, setShowOwnerAuth] = useState(false);
  const [showGirlfriendAuth, setShowGirlfriendAuth] = useState(false);

  const handleOwnerAuth = async (password: string): Promise<boolean> => {
    // Check if password matches the permanent owner password
    const ownerPassword = '1-A-J-S-I-D-H-U#';
    
    if (password === ownerPassword) {
      // Check if owner exists in database, if not create one
      const { data: owner } = await supabase
        .from('owners')
        .select('*')
        .eq('email', 'owner@app.com')
        .single();

      if (!owner) {
        // Create owner account
        const hashedPassword = await bcrypt.hash(ownerPassword, 10);
        const { data: newOwner, error } = await supabase
          .from('owners')
          .insert([{
            email: 'owner@app.com',
            password_hash: hashedPassword
          }])
          .select()
          .single();

        if (error || !newOwner) return false;
        login(newOwner.id, 'owner');
      } else {
        login(owner.id, 'owner');
      }
      
      navigate('/owner');
      return true;
    }
    return false;
  };

  const handleGirlfriendAuth = async (credentials: string): Promise<boolean> => {
    const [username, password] = credentials.split(':');
    
    // Check girlfriend credentials in database
    const { data: user } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', username)
      .eq('active', true)
      .single();

    if (user && await bcrypt.compare(password, user.password_hash)) {
      login(user.id, 'girlfriend', user.owner_id);
      
      // Find the chat for this user
      const { data: participant } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.id)
        .eq('role', 'girlfriend')
        .single();

      if (participant) {
        navigate(`/chat/${participant.chat_id}`);
        return true;
      } else {
        // Auto-create a private DM with the owner
        const { data: chat, error: chatErr } = await supabase
          .from('chats')
          .insert([{ owner_id: user.owner_id, title: user.display_name }])
          .select()
          .single();

        if (chatErr || !chat) return false;

        await supabase
          .from('chat_participants')
          .insert([{ chat_id: chat.id, owner_id: user.owner_id, role: 'owner' }]);

        await supabase
          .from('chat_participants')
          .insert([{ chat_id: chat.id, user_id: user.id, role: 'girlfriend' }]);

        navigate(`/chat/${chat.id}`);
        return true;
      }
    }
    return false;
  };

  if (isLocked) {
    return <LockScreen />;
  }

  if (showOwnerAuth) {
    return (
      <PasswordPrompt
        title="Owner Authentication"
        placeholder="Enter owner password"
        onSubmit={handleOwnerAuth}
        onBack={() => setShowOwnerAuth(false)}
      />
    );
  }

  if (showGirlfriendAuth) {
    return (
      <PasswordPrompt
        title="Girlfriend Login"
        placeholder="Enter password"
        onSubmit={handleGirlfriendAuth}
        onBack={() => setShowGirlfriendAuth(false)}
        showUsername={true}
      />
    );
  }

  return (
    <UserSelection
      onSelectOwner={() => setShowOwnerAuth(true)}
      onSelectGirlfriend={() => setShowGirlfriendAuth(true)}
    />
  );
};

export default Index;
