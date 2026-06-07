import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCreateCompanyWithUser } from '@/hooks/useCompany';
import { supabase } from '@/integrations/supabase/client';
import { Industry } from '@/hooks/useIndustry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Building2, Mail, Lock, User, Briefcase, GraduationCap, Home, Car } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');
const companySchema = z.string().min(2, 'Company name must be at least 2 characters');

type FormErrors = {
  email?: string;
  password?: string;
  name?: string;
  companyName?: string;
  companyEmail?: string;
};

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [industry, setIndustry] = useState<Industry>('real_estate');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const { signIn, pendingPasswordSetup, markPendingPasswordSetup, clearPendingPasswordSetup } = useAuth();
  const isPasswordSetup = pendingPasswordSetup;
  const createCompanyWithUser = useCreateCompanyWithUser();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery') || hash.includes('type=invite')) {
      markPendingPasswordSetup();
      setIsLogin(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        markPendingPasswordSetup();
        setIsLogin(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [markPendingPasswordSetup]);

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth`,
      });
      setForgotSent(true);
    } catch {
      // Always show success — never reveal if email exists
      setForgotSent(true);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors({ password: err.errors[0].message });
        return;
      }
    }

    if (password !== confirmPassword) {
      setErrors({ password: 'Passwords do not match' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      clearPendingPasswordSetup();
      toast({
        title: 'Password set',
        description: 'Your password is ready. You are now signed in.',
      });
      window.history.replaceState({}, document.title, '/auth');
      navigate('/');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to set password';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};

    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    if (!isLogin) {
      try {
        nameSchema.parse(name);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.name = e.errors[0].message;
        }
      }

      try {
        companySchema.parse(companyName);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.companyName = e.errors[0].message;
        }
      }

      try {
        emailSchema.parse(companyEmail || email);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.companyEmail = e.errors[0].message;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isPasswordSetup) {
      await handleSetPassword(e);
      return;
    }

    if (!validateForm()) return;

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          let message = 'Failed to sign in';
          if (error.message.includes('Invalid login credentials')) {
            message = 'Invalid email or password';
          } else if (error.message.includes('Email not confirmed')) {
            message = 'Please check your email to confirm your account';
          }
          toast({
            title: 'Error',
            description: message,
            variant: 'destructive',
          });
        } else {
          navigate('/');
        }
      } else {
        // Create company and super admin user
        await createCompanyWithUser.mutateAsync({
          companyName,
          companyEmail: companyEmail || email,
          userName: name,
          userEmail: email,
          password,
          industry,
        });

        toast({
          title: 'Account created',
          description:
            'Account created! We have sent a confirmation email from support@aileadx.in. Please check your inbox.',
        });
        navigate('/');
      }
    } catch (error: any) {
      let message = 'Failed to sign up';
      if (error.message?.includes('User already registered')) {
        message = 'An account with this email already exists';
      } else if (error.message?.includes('duplicate key')) {
        message = 'A company with this email already exists';
      } else if (error.message) {
        message = error.message;
      }
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
            <Building2 className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">RealCRM</h1>
            <p className="text-xs text-muted-foreground">Multi-Industry CRM</p>
          </div>
        </div>

        <Card className="card-elevated border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {isPasswordSetup
                ? 'Set your password'
                : isLogin
                  ? 'Welcome back'
                  : 'Register your company'}
            </CardTitle>
            <CardDescription>
              {isPasswordSetup
                ? 'Create a password for your invited account, then you will be signed in.'
                : isLogin
                  ? 'Sign in to access your CRM dashboard'
                  : 'Create your company account and become the Super Admin'}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {isPasswordSetup ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="new-password"
                        name="new-password"
                        autoComplete="new-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {errors.password && (
                      <p className="text-xs text-destructive">{errors.password}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        autoComplete="new-password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </>
              ) : !isLogin && (
                <>
                  {/* Company Details */}
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="companyName"
                        name="companyName"
                        autoComplete="organization"
                        type="text"
                        placeholder="Acme Real Estate"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {errors.companyName && (
                      <p className="text-xs text-destructive">{errors.companyName}</p>
                    )}
                  </div>
 
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Company Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="companyEmail"
                        name="companyEmail"
                        autoComplete="email"
                        type="email"
                        placeholder="contact@company.com"
                        value={companyEmail}
                        onChange={(e) => setCompanyEmail(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {errors.companyEmail && (
                      <p className="text-xs text-destructive">{errors.companyEmail}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Leave empty to use your personal email</p>
                  </div>
 
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry Type *</Label>
                    <Select value={industry} onValueChange={(value: 'real_estate' | 'education' | 'automobile_dealers') => setIndustry(value)}>
                      <SelectTrigger id="industry">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="real_estate">
                          <div className="flex items-center gap-2">
                            <Home className="w-4 h-4" />
                            <span>Real Estate</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="education">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4" />
                            <span>Coaching / Education</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="automobile_dealers">
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4" />
                            <span>Automobile Dealers</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="internal_crm">
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            <span>Internal CRM (Admin Only)</span>
                          </div>
                        </SelectItem>
                        {/* non-target industries removed */}
                      </SelectContent>
                    </Select>
                  </div>
 
                  <div className="border-t border-border my-4 pt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Your Account (Super Admin)</p>
                  </div>
 
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="name"
                        name="name"
                        autoComplete="name"
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name}</p>
                    )}
                  </div>
                </>
              )}
 
              {!isPasswordSetup && (
              <div className="space-y-2">
                <Label htmlFor="email">{isLogin ? 'Email' : 'Your Email'}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    autoComplete="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>
              )}
 
              {!isPasswordSetup && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full gradient-primary border-0"
                disabled={loading}
              >
                {loading
                  ? 'Please wait...'
                  : isPasswordSetup
                    ? 'Save password'
                    : isLogin
                      ? 'Sign In'
                      : 'Register Company'}
              </Button>

              {!isPasswordSetup && (
              <p className="text-sm text-center text-muted-foreground">
                {isLogin ? "Don't have a company account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setErrors({});
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  {isLogin ? 'Register company' : 'Sign in'}
                </button>
              </p>
              )}

              {isLogin && !isPasswordSetup && (
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setForgotSent(false);
                    setForgotEmail('');
                  }}
                  className="text-sm text-muted-foreground hover:text-primary hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </CardFooter>
          </form>
        </Card>

        <Dialog
          open={isForgotPassword}
          onOpenChange={(open) => {
            setIsForgotPassword(open);
            setForgotSent(false);
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Reset your password</DialogTitle>
              <DialogDescription>
                Enter your email address and we&apos;ll send you a reset link.
              </DialogDescription>
            </DialogHeader>

            {!forgotSent ? (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      name="email"
                      autoComplete="email"
                      type="email"
                      placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="pl-9"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleForgotPassword();
                        }
                      }}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  className="w-full gradient-primary border-0"
                  disabled={forgotLoading || !forgotEmail.trim()}
                  onClick={handleForgotPassword}
                >
                  {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </div>
            ) : (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <Mail className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm text-muted-foreground">
                  If an account exists for <strong>{forgotEmail}</strong>, a password reset link has been sent. Check
                  your inbox and spam folder.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setForgotSent(false);
                  }}
                >
                  Back to sign in
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
