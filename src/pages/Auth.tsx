import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCreateCompanyWithUser } from '@/hooks/useCompany';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Building2, Mail, Lock, User, Briefcase } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const { signIn } = useAuth();
  const createCompanyWithUser = useCreateCompanyWithUser();
  const navigate = useNavigate();
  const { toast } = useToast();

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
        });
        
        toast({
          title: 'Success',
          description: 'Company registered successfully! You are now the Super Admin.',
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
            <h1 className="text-2xl font-bold text-foreground">PropCRM</h1>
            <p className="text-xs text-muted-foreground">Real Estate CRM</p>
          </div>
        </div>

        <Card className="card-elevated border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {isLogin ? 'Welcome back' : 'Register your company'}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? 'Sign in to access your CRM dashboard' 
                : 'Create your company account and become the Super Admin'}
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {!isLogin && (
                <>
                  {/* Company Details */}
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="companyName"
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

                  <div className="border-t border-border my-4 pt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Your Account (Super Admin)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Your Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="name"
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
              
              <div className="space-y-2">
                <Label htmlFor="email">{isLogin ? 'Email' : 'Your Email'}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
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
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
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
            </CardContent>
            
            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full gradient-primary border-0"
                disabled={loading}
              >
                {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Register Company')}
              </Button>
              
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
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
