import { useState } from 'react';
import { TeamChat } from './TeamChat';
import { TaskManagement } from './TaskManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, CheckSquare } from 'lucide-react';

export function PersonalWorkspace() {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="animate-fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Team Chat
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            My Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-6">
          <TeamChat />
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <TaskManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
