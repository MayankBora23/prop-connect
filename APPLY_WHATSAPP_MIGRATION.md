# Apply WhatsApp Integration Migration

Since the Supabase CLI is not installed, you'll need to apply the migration manually through the Supabase Dashboard.

## Step 1: Open Supabase Dashboard

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar

## Step 2: Apply the Migration

1. Click **"New Query"**
2. Copy the entire contents of `supabase/migration_create_whatsapp_integration.sql`
3. Paste it into the SQL Editor
4. Click **"Run"** to execute the migration

The migration will create:
- `whatsapp_settings` table
- `whatsapp_conversations` table
- `whatsapp_messages` table
- All necessary triggers, policies, and permissions

## Step 3: Verify the Migration

After running the migration, you can verify it worked by:

1. Go to **Table Editor** in your Supabase dashboard
2. You should see the new tables: `whatsapp_settings`, `whatsapp_conversations`, `whatsapp_messages`

## Step 4: Regenerate TypeScript Types

After the migration is applied, you need to regenerate the Supabase TypeScript types:

### Option A: Using Supabase CLI (if you install it later)
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > src/integrations/supabase/types.ts
```

### Option B: Manual Type Updates

For now, you'll need to add the WhatsApp table types manually to `src/integrations/supabase/types.ts`. Add these to the `Tables` interface:

```typescript
whatsapp_settings: {
  Row: {
    id: string
    company_id: string
    twilio_sid: string
    twilio_auth_token: string
    whatsapp_number: string
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    company_id: string
    twilio_sid: string
    twilio_auth_token: string
    whatsapp_number: string
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    company_id?: string
    twilio_sid?: string
    twilio_auth_token?: string
    whatsapp_number?: string
    created_at?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "whatsapp_settings_company_id_fkey"
      columns: ["company_id"]
      isOneToOne: true
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
  ]
}
whatsapp_conversations: {
  Row: {
    id: string
    company_id: string
    contact_phone: string
    contact_name: string | null
    last_message_at: string
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    company_id: string
    contact_phone: string
    contact_name?: string | null
    last_message_at?: string
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    company_id?: string
    contact_phone?: string
    contact_name?: string | null
    last_message_at?: string
    created_at?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "whatsapp_conversations_company_id_fkey"
      columns: ["company_id"]
      isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
  ]
}
whatsapp_messages: {
  Row: {
    id: string
    conversation_id: string
    direction: Database["public"]["Enums"]["message_direction"]
    body: string
    status: string
    message_sid: string | null
    created_at: string
    company_id: string
  }
  Insert: {
    id?: string
    conversation_id: string
    direction: Database["public"]["Enums"]["message_direction"]
    body: string
    status?: string
    message_sid?: string | null
    created_at?: string
    company_id: string
  }
  Update: {
    id?: string
    conversation_id?: string
    direction?: Database["public"]["Enums"]["message_direction"]
    body?: string
    status?: string
    message_sid?: string | null
    created_at?: string
    company_id?: string
  }
  Relationships: [
    {
      foreignKeyName: "whatsapp_messages_company_id_fkey"
      columns: ["company_id"]
      isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "whatsapp_messages_conversation_id_fkey"
      columns: ["conversation_id"]
      isOneToOne: false
      referencedRelation: "whatsapp_conversations"
      referencedColumns: ["id"]
    }
  ]
}
```

## Step 5: Deploy the Edge Function

1. In your Supabase Dashboard, go to **Edge Functions**
2. Click **"Create a new function"**
3. Name it: `whatsapp-webhook`
4. Copy the contents of `supabase/functions/whatsapp-webhook/index.ts`
5. Deploy the function

## Next Steps

Once you've completed these steps, the TypeScript errors should be resolved and you can proceed with:

1. Configuring WhatsApp settings in Company Settings
2. Setting up Cloudflare Tunnel (following `CLOUDFLARE_TUNNEL_SETUP.md`)
3. Testing the integration

The integration will be fully functional once these steps are complete!</contents>
</xai:function_call">APPLY_WHATSAPP_MIGRATION.md
