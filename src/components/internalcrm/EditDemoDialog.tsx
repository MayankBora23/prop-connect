import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useUpdateInternalDemo, InternalDemo, DemoStatus } from '@/hooks/useInternalDemos';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const editDemoSchema = z.object({
    demo_date: z.string().min(1, 'Demo date is required'),
    demo_time: z.string().min(1, 'Demo time is required'),
    status: z.enum(['scheduled', 'completed', 'cancelled']),
    notes: z.string().trim().max(500, 'Notes must be less than 500 characters').optional().or(z.literal('')),
});

type EditDemoFormData = z.infer<typeof editDemoSchema>;

interface EditDemoDialogProps {
    demo: InternalDemo | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditDemoDialog({ demo, open, onOpenChange }: EditDemoDialogProps) {
    const { toast } = useToast();
    const updateDemo = useUpdateInternalDemo();

    const form = useForm<EditDemoFormData>({
        resolver: zodResolver(editDemoSchema),
        defaultValues: {
            demo_date: '',
            demo_time: '',
            status: 'scheduled',
            notes: '',
        },
    });

    useEffect(() => {
        if (demo && open) {
            form.reset({
                demo_date: demo.demo_date,
                demo_time: demo.demo_time,
                status: demo.status,
                notes: demo.notes || '',
            });
        }
    }, [demo, open, form]);

    const onSubmit = async (data: EditDemoFormData) => {
        if (!demo) return;

        try {
            await updateDemo.mutateAsync({
                id: demo.id,
                ...data,
            });

            toast({
                title: 'Demo updated',
                description: 'The demo session details have been updated successfully.',
            });

            onOpenChange(false);
        } catch (error: any) {
            console.error('Update demo error:', error);
            toast({
                title: 'Error updating demo',
                description: error?.message || 'Failed to update demo details.',
                variant: 'destructive',
            });
        }
    };

    if (!demo) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Demo Details</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="demo_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Demo Date *</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="demo_time"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Demo Time *</FormLabel>
                                        <FormControl>
                                            <Input type="time" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="scheduled">Scheduled</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Add any internal notes here..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateDemo.isPending} className="gradient-primary border-0">
                                {updateDemo.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
