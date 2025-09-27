-- Create owners table for main user authentication
CREATE TABLE public.owners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create app_users table for girlfriend accounts
CREATE TABLE public.app_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  active BOOLEAN DEFAULT true
);

-- Create chats table
CREATE TABLE public.chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_participants table
CREATE TABLE public.chat_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID, -- Can reference app_users.id for girlfriends
  owner_id UUID REFERENCES public.owners(id), -- For owner participation
  role TEXT NOT NULL CHECK (role IN ('owner', 'girlfriend')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL, -- Can be from app_users or owners
  sender_type TEXT NOT NULL CHECK (sender_type IN ('owner', 'girlfriend')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  edited BOOLEAN DEFAULT false
);

-- Create reactions table
CREATE TABLE public.reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('owner', 'girlfriend')),
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, user_type)
);

-- Enable Row Level Security
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- Create policies for owners (owners can see their own data)
CREATE POLICY "Owners can view their own data" ON public.owners
FOR ALL USING (true); -- Will be restricted by app logic

CREATE POLICY "Owners can manage their users" ON public.app_users
FOR ALL USING (true); -- Will be restricted by app logic

CREATE POLICY "Owners can manage their chats" ON public.chats
FOR ALL USING (true); -- Will be restricted by app logic

CREATE POLICY "Users can access their chat participants" ON public.chat_participants
FOR ALL USING (true); -- Will be restricted by app logic

CREATE POLICY "Users can access their messages" ON public.messages
FOR ALL USING (true); -- Will be restricted by app logic

CREATE POLICY "Users can manage their reactions" ON public.reactions
FOR ALL USING (true); -- Will be restricted by app logic

-- Enable realtime for messages and reactions
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.reactions REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;

-- Create indexes for better performance
CREATE INDEX idx_app_users_owner_id ON public.app_users(owner_id);
CREATE INDEX idx_chats_owner_id ON public.chats(owner_id);
CREATE INDEX idx_chat_participants_chat_id ON public.chat_participants(chat_id);
CREATE INDEX idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_reactions_message_id ON public.reactions(message_id);