import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WalletCard } from './WalletCard';
import { WhatsAppUsageStats } from './WhatsAppUsageStats';
import { TransactionHistory } from './TransactionHistory';
import { TelephonyBillingCard } from './TelephonyBillingCard';

export function CreditsView() {
  return (
    <div className="space-y-8 animate-fade-in">
      <WalletCard />
      <TelephonyBillingCard />
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <WhatsAppUsageStats />
        </TabsContent>
        <TabsContent value="transactions" className="mt-6">
          <TransactionHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
