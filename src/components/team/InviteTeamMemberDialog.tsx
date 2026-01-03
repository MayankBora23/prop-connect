import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInviteTeamMember, AppRole } from '@/hooks/useCompany';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Copy, Eye, EyeOff, Key, Shuffle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface InviteTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  currentUserRole: AppRole | null;
}

export function InviteTeamMemberDialog({
  open,
  onOpenChange,
  companyId,
  currentUserRole
}: InviteTeamMemberDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('sales');
  const [passwordMode, setPasswordMode] = useState<'auto' | 'manual'>('auto');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const inviteMember = useInviteTeamMember();
  const { toast } = useToast();

  // Generate a secure random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(password);
  };

  // Copy password to clipboard
  const copyPassword = async () => {
    const passwordToCopy = passwordMode === 'auto' ? generatedPassword : customPassword;
    if (!passwordToCopy) return;

    try {
      await navigator.clipboard.writeText(passwordToCopy);
      toast({
        title: 'Copied!',
        description: 'Password copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy password',
        variant: 'destructive',
      });
    }
  };

  // Validate custom password (same logic as Auth page)
  const validatePassword = (password: string): { isValid: boolean; message: string } => {
    if (password.length < 6) {
      return { isValid: false, message: 'Password must be at least 6 characters' };
    }
    return { isValid: true, message: 'Password meets requirements' };
  };

  // Determine which roles the current user can assign
  const getAvailableRoles = (): AppRole[] => {
    if (currentUserRole === 'super_admin') {
      return ['admin', 'manager', 'sales'];
    }
    if (currentUserRole === 'admin') {
      return ['manager', 'sales'];
    }
    return ['sales'];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    let finalPassword: string;
    if (passwordMode === 'auto') {
      if (!generatedPassword) {
        toast({
          title: 'Error',
          description: 'Please generate a password for the team member',
          variant: 'destructive',
        });
        return;
      }
      finalPassword = generatedPassword;
    } else {
      if (!customPassword.trim()) {
        toast({
          title: 'Error',
          description: 'Please enter a password for the team member',
          variant: 'destructive',
        });
        return;
      }

      const validation = validatePassword(customPassword);
      if (!validation.isValid) {
        toast({
          title: 'Invalid Password',
          description: validation.message,
          variant: 'destructive',
        });
        return;
      }
      finalPassword = customPassword;
    }

    try {
      console.log('Starting invitation process for:', { name, email, role, passwordMode });
      const result = await inviteMember.mutateAsync({
        name,
        email,
        role,
        companyId,
        password: finalPassword,
      });

      console.log('Invitation result:', result);

      toast({
        title: 'Success',
        description: `Successfully invited ${name} as ${role.replace('_', ' ')}. They will appear in the team list shortly.`,
      });

      // Reset form
      setName('');
      setEmail('');
      setRole('sales');
      setPasswordMode('auto');
      setGeneratedPassword('');
      setCustomPassword('');

      // Close dialog after a brief delay to show success message
      setTimeout(() => {
        onOpenChange(false);
      }, 1000);
    } catch (error: unknown) {
      console.error('Invitation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to invite team member';
      toast({
        title: 'Invitation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const availableRoles = getAvailableRoles();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as AppRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Password</Label>
            <Tabs value={passwordMode} onValueChange={(value) => setPasswordMode(value as 'auto' | 'manual')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="auto" className="flex items-center gap-2">
                  <Shuffle className="w-4 h-4" />
                  Auto Generate
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Set Password
                </TabsTrigger>
              </TabsList>

              <TabsContent value="auto" className="space-y-2 mt-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Click 'Generate Password' to create a secure password"
                      value={generatedPassword}
                      readOnly
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={!generatedPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generatePassword}
                    className="shrink-0"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={copyPassword}
                    disabled={!generatedPassword}
                    className="shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Generate a secure password automatically. The password will be sent to the team member via email.
                </p>
              </TabsContent>

              <TabsContent value="manual" className="space-y-2 mt-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter a secure password"
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={!customPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={copyPassword}
                    disabled={!customPassword}
                    className="shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>Password must be at least 6 characters long</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={inviteMember.isPending}>
              {inviteMember.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Invite
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
