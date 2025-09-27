import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PasswordPromptProps {
  title: string;
  placeholder?: string;
  onSubmit: (password: string) => Promise<boolean>;
  onBack: () => void;
  showUsername?: boolean;
}

const PasswordPrompt = ({ 
  title, 
  placeholder = "Enter password", 
  onSubmit, 
  onBack,
  showUsername = false 
}: PasswordPromptProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setIsLoading(true);
    
    try {
      const success = await onSubmit(showUsername ? `${username}:${password}` : password);
      
      if (success) {
        toast({
          title: "Success",
          description: "Authentication successful",
        });
      } else {
        setIsShaking(true);
        toast({
          title: "Authentication Failed",
          description: "Invalid credentials",
          variant: "destructive",
        });
        setTimeout(() => setIsShaking(false), 500);
        setPassword('');
        if (showUsername) setUsername('');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Authentication failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className={`glass-morphism p-8 rounded-2xl shadow-2xl max-w-md w-full ${
          isShaking ? 'shake' : ''
        }`}
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-muted-foreground">Enter your credentials</p>
        </div>

        <div className="space-y-4">
          {showUsername && (
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-background/50"
            />
          )}
          <Input
            type="password"
            placeholder={placeholder}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            className="bg-background/50"
          />
          <Button
            onClick={handleSubmit}
            className="w-full btn-glow text-primary-foreground font-semibold py-3"
            disabled={isLoading || password.length === 0 || (showUsername && username.length === 0)}
          >
            {isLoading ? 'Authenticating...' : 'Login'}
          </Button>
        </div>

        <div className="text-center mt-6">
          <Button
            onClick={onBack}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            ← Back
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default PasswordPrompt;