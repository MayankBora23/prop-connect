import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateEmployee } from '@/hooks/useEmployees';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Helper function to parse salary strings with K, L, Cr suffixes
function parseSalary(salaryStr: string): number | null {
  if (!salaryStr || salaryStr.trim() === '') return null;

  const trimmed = salaryStr.trim().toLowerCase();
  let multiplier = 1;

  if (trimmed.endsWith('k')) {
    multiplier = 1000;
    salaryStr = trimmed.slice(0, -1);
  } else if (trimmed.endsWith('l')) {
    multiplier = 100000; // 1 lakh
    salaryStr = trimmed.slice(0, -1);
  } else if (trimmed.endsWith('cr')) {
    multiplier = 10000000; // 1 crore
    salaryStr = trimmed.slice(0, -2);
  }

  const parsed = parseFloat(salaryStr);
  if (isNaN(parsed) || parsed < 0) return null;

  return parsed * multiplier;
}

const employeeSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required').max(255),
  phone: z.string().trim().min(10, 'Phone must be at least 10 digits').max(20),
  email: z.string().trim().email('Invalid email address').max(255).optional().or(z.literal('')),
  role: z.string().trim().min(1, 'Role is required').max(100),
  department: z.string().trim().max(100).optional().or(z.literal('')),
  employment_type: z.enum(['full-time', 'part-time', 'contract']),
  salary: z.string().optional(),
  date_of_joining: z.string().optional().or(z.literal('')),
  reporting_manager: z.string().trim().max(255).optional().or(z.literal('')),
  address: z.string().trim().max(1000).optional().or(z.literal('')),
  aadhaar_number: z.string().trim().length(12, 'Aadhaar number must be exactly 12 digits').regex(/^\d{12}$/, 'Aadhaar number must contain only digits').optional().or(z.literal('')),
  pan_number: z.string().trim().length(10, 'PAN number must be exactly 10 characters').regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format').optional().or(z.literal('')),
  bank_account_holder_name: z.string().trim().max(255).optional().or(z.literal('')),
  bank_name: z.string().trim().max(255).optional().or(z.literal('')),
  bank_account_number: z.string().trim().max(50).optional().or(z.literal('')),
  bank_ifsc_code: z.string().trim().length(11, 'IFSC code must be exactly 11 characters').optional().or(z.literal('')),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddEmployeeDialog({ open, onOpenChange }: AddEmployeeDialogProps) {
  const { toast } = useToast();
  const createEmployee = useCreateEmployee();

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      email: '',
      role: '',
      department: '',
      employment_type: 'full-time',
      salary: undefined,
      date_of_joining: '',
      reporting_manager: '',
      address: '',
      aadhaar_number: '',
      pan_number: '',
      bank_account_holder_name: '',
      bank_name: '',
      bank_account_number: '',
      bank_ifsc_code: '',
    },
  });

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      await createEmployee.mutateAsync({
        full_name: data.full_name,
        phone: data.phone,
        email: data.email || null,
        role: data.role,
        department: data.department || null,
        employment_type: data.employment_type,
        salary: parseSalary(data.salary),
        date_of_joining: data.date_of_joining || null,
        reporting_manager: data.reporting_manager || null,
        address: data.address || null,
        aadhaar_number: data.aadhaar_number || null,
        pan_number: data.pan_number || null,
        bank_account_holder_name: data.bank_account_holder_name || null,
        bank_name: data.bank_name || null,
        bank_account_number: data.bank_account_number || null,
        bank_ifsc_code: data.bank_ifsc_code || null,
      });

      toast({
        title: 'Employee created',
        description: `${data.full_name} has been added successfully.`,
      });

      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Create employee error:', error);
      const description = error?.message || error?.error || JSON.stringify(error) || 'Failed to create employee. Please try again.';
      toast({
        title: 'Error creating employee',
        description,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Fill in the employee details. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email address" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role / Designation *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter role/designation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter department" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="salary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="e.g., 50000, 50K, 5L, 1Cr"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date_of_joining"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Joining</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reporting_manager"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reporting Manager</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter reporting manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Identity Proof */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Identity Proof</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="aadhaar_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aadhaar Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter 12-digit Aadhaar number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pan_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PAN Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter PAN number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">Bank Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bank_account_holder_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Holder Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter account holder name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bank_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter bank name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bank_account_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter account number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bank_ifsc_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IFSC Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter IFSC code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createEmployee.isPending}>
                {createEmployee.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Employee
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}