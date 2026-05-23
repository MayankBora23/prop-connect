import { useAllCompanies, useCurrentCompany } from '@/hooks/useCompany';
import { useCurrentProfile } from '@/hooks/useProfiles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Briefcase, Globe, LayoutDashboard } from 'lucide-react';
import { format } from 'date-fns';

export const InternalCRMDashboard = () => {
    const { data: companies, isLoading } = useAllCompanies();
    const { data: company } = useCurrentCompany();
    const { data: profile } = useCurrentProfile();

    const totalCompanies = companies?.length || 0;
    const realEstateCompanies = companies?.filter(c => c.industry === 'real_estate').length || 0;
    const educationCompanies = companies?.filter(c => c.industry === 'education').length || 0;
    const autoCompanies = companies?.filter(c => c.industry === 'automobile_dealers').length || 0;
    const currentDate = format(new Date(), 'EEEE, MMMM d, yyyy');

    const stats = [
        {
            title: 'Total Companies',
            value: totalCompanies,
            icon: Building2,
            description: 'Total registered businesses',
            color: 'text-blue-600',
            bgColor: 'bg-blue-100'
        },
        {
            title: 'Real Estate',
            value: realEstateCompanies,
            icon: Globe,
            description: 'Property management firms',
            color: 'text-green-600',
            bgColor: 'bg-green-100'
        },
        {
            title: 'Education',
            value: educationCompanies,
            icon: Users,
            description: 'Schools and institutes',
            color: 'text-purple-600',
            bgColor: 'bg-purple-100'
        },
        {
            title: 'Automobile',
            value: autoCompanies,
            icon: Briefcase,
            description: 'Dealers and showrooms',
            color: 'text-orange-600',
            bgColor: 'bg-orange-100'
        }
    ];

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="h-24 bg-muted/50" />
                            <CardContent className="h-16 bg-muted/30" />
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Beautiful Banner */}
            <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-8">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shrink-0 shadow-lg">
                            <LayoutDashboard className="w-7 h-7 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                                Welcome back, {profile?.name || 'User'}!
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">Internal CRM</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{currentDate}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.title} className="hover:shadow-lg transition-shadow duration-300">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                            <div className={`${stat.bgColor} p-2 rounded-lg`}>
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>System Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground italic">System analytics and growth charts coming soon...</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
