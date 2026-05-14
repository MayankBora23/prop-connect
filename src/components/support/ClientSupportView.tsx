import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TicketListView } from './TicketListView';
import { NewTicketForm } from './NewTicketForm';

export function ClientSupportView() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'new'>('tickets');

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'tickets' | 'new')}
        className="flex flex-col flex-1 min-h-0"
      >
        <TabsList className="sticky top-0 z-20 h-12 w-full shrink-0 justify-center gap-1 rounded-none border-b bg-background p-1 md:static md:z-0 md:mb-3 md:h-auto md:w-fit md:self-center md:rounded-md md:border">
          <TabsTrigger value="tickets" className="flex-1 sm:flex-none">
            My Tickets
          </TabsTrigger>
          <TabsTrigger value="new" className="flex-1 sm:flex-none">
            New ticket
          </TabsTrigger>
        </TabsList>
        <div className="flex-1 min-h-0 pt-3">
          <TabsContent value="tickets" className="mt-0 h-full focus-visible:outline-none">
            <TicketListView onOpenNewTicket={() => setActiveTab('new')} />
          </TabsContent>
          <TabsContent value="new" className="mt-0 focus-visible:outline-none">
            <NewTicketForm onSuccess={() => setActiveTab('tickets')} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
