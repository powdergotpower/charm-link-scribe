import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';

const LockScreen = () => {
  const [pin, setPin] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const { toast } = useToast();
  const unlock = useAuthStore((state) => state.unlock);

  const handlePinSubmit = () => {
    if (pin === '1958') {
      unlock();
      toast({
        title: "Access Granted",
        description: "Welcome to the app",
      });
    } else {
      setIsShaking(true);
      toast({
        title: "Access Denied",
        description: "Incorrect PIN code",
        variant: "destructive",
      });
      setTimeout(() => setIsShaking(false), 500);
      setPin('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className={`glass-morphism p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 ${
          isShaking ? 'shake' : ''
        }`}
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary to-primary-glow pulse-glow flex items-center justify-center">
            <svg className="w-10 h-10 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Secure Access</h1>
          <p className="text-muted-foreground">Enter PIN to continue</p>
        </motion.div>

        <div className="space-y-4">
          <Input
            type="password"
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handlePinSubmit()}
            className="text-center text-lg tracking-[0.5em] bg-background/50"
            maxLength={4}
          />
          <Button
            onClick={handlePinSubmit}
            className="w-full btn-glow text-primary-foreground font-semibold py-3"
            disabled={pin.length !== 4}
          >
            Unlock
          </Button>
        </div>

        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-center mt-6 text-sm text-muted-foreground"
        >
          PIN: 1958
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LockScreen;