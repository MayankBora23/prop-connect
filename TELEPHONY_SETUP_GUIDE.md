# RealCRM Telephony Integration Setup Guide

This guide provides comprehensive instructions for setting up and using the Twilio-powered telephony features in RealCRM.

## Overview

The telephony integration enables voice calling capabilities for CRM users, allowing agents to make outbound calls to leads and receive inbound calls. The system integrates with Twilio's Voice API and provides call logging, status tracking, and lead management.

## Architecture Components

### Database Schema
- **call_logs**: Stores call records with status, duration, and Twilio metadata
- **whatsapp_settings**: Extended with Twilio Voice credentials
- **profiles**: Added `agent_identity` field for Twilio client identification
- **leads**: Added `is_telephony_enabled` and `last_called_at` fields

### Edge Functions
- **get-voice-token**: Generates Twilio access tokens for client authentication
- **voice-router**: Handles TwiML webhooks for call routing
- **voice-status**: Processes call status updates and updates database

### Frontend Integration
- Twilio Voice SDK integration
- Real-time call status management
- Lead-based calling interface

## Prerequisites

1. **Twilio Account**: Active Twilio account with Voice capabilities
2. **Verified Phone Numbers**: At least one Twilio phone number for outbound calling
3. **TwiML Application**: Configured TwiML App in Twilio Console
4. **API Keys**: Twilio API Key and Secret for token generation

## Step-by-Step Setup

### 1. Twilio Configuration

#### Create a TwiML Application
1. Log into your [Twilio Console](https://console.twilio.com)
2. Navigate to **Voice > Manage > TwiML Apps**
3. Click **Create new TwiML App**
4. Configure the following URLs:
   - **Voice Request URL**: `https://your-supabase-url.supabase.co/functions/v1/voice-router`
   - **Status Callback URL**: `https://your-supabase-url.supabase.co/functions/v1/voice-status`
5. Note the **TwiML App SID** for later use

#### Create API Keys
1. In Twilio Console, go to **Settings > API Keys**
2. Click **Create API Key**
3. Choose **Standard** key type
4. Note the **API Key SID** and **API Key Secret**

#### Get Your Twilio Credentials
- **Account SID**: Found in your Twilio Console dashboard
- **Auth Token**: Found in your Twilio Console dashboard
- **Phone Number**: A verified Twilio number for outbound calls

### 2. Database Migration

Run the database migration to add telephony schema:

```sql
-- This migration is already created in: supabase/20260102000000_migration_create_telephony_integration.sql
-- Apply it using: supabase db reset
```

The migration adds:
- `call_logs` table for call tracking
- Twilio Voice fields to `whatsapp_settings`
- `agent_identity` to user profiles
- `is_telephony_enabled` and `last_called_at` to leads

### 3. Configure WhatsApp/Twilio Settings

In your RealCRM application:

1. Go to **Settings > WhatsApp Integration**
2. Add the following additional fields:
   - **Twilio API Key SID**: From step 1.2
   - **Twilio API Key Secret**: From step 1.2
   - **Twilio TwiML App SID**: From step 1.1

### 4. Agent Configuration

Each agent needs to be configured with an identity:

1. Go to **Profile Settings**
2. Set **Agent Identity**: A unique identifier for the agent (e.g., `agent_john_doe`)
3. This identity is used by Twilio to route incoming calls

### 5. Lead Telephony Enablement

To enable telephony for specific leads:

1. Go to the **Leads** section
2. Edit a lead
3. Check **Enable Telephony** to add them to the calling queue

## Usage Guide

### Making Calls

1. Navigate to the **Telephony** tab
2. View the list of telephony-enabled leads
3. Click the **Call** button next to any lead
4. The system will:
   - Request a Twilio access token
   - Initialize the call using Twilio Voice SDK
   - Display call status and duration
   - Log the call in the database

### Call Management

- **Call Status**: Shows current call state (Idle, Dialing, Connected, Disconnected)
- **Device Status**: Indicates if the Twilio device is ready
- **Call Duration**: Tracks call length when connected
- **End Call**: Click to terminate active calls

### Call History

View call logs in the database:
- All calls are automatically logged with duration and status
- Leads are updated with `last_called_at` timestamp
- Call recordings can be stored (if enabled in Twilio)

## Webhook Configuration

The Edge Functions handle Twilio webhooks automatically. Ensure your Supabase project allows public access to these functions.

### Voice Router Webhook
- **URL**: `/functions/v1/voice-router`
- **Purpose**: Routes calls and generates TwiML responses
- **Method**: POST (handles both inbound and outbound calls)

### Voice Status Webhook
- **URL**: `/functions/v1/voice-status`
- **Purpose**: Updates call status and logs completion
- **Method**: POST (receives status updates from Twilio)

## Troubleshooting

### Common Issues

#### Device Not Ready
- **Cause**: Missing Twilio credentials or agent identity
- **Solution**: Check WhatsApp settings and ensure agent identity is set

#### Call Fails to Connect
- **Cause**: Invalid phone number or Twilio configuration
- **Solution**: Verify phone number format and Twilio credentials

#### Webhook Errors
- **Cause**: Supabase function URL incorrect or permissions issue
- **Solution**: Verify webhook URLs in Twilio TwiML App settings

#### Token Generation Fails
- **Cause**: Invalid API keys or missing agent identity
- **Solution**: Check Twilio API credentials and agent profile

### Debugging

Enable debug logging in the browser console:
- Twilio device logs are set to 'debug' level
- Check browser console for connection issues
- Monitor Supabase function logs for webhook errors

## Security Considerations

- API keys are stored encrypted in the database
- Access tokens are generated server-side with short expiration
- Webhooks validate requests (implement signature verification for production)
- RLS policies ensure users only access their company's data

## Cost Management

Monitor Twilio usage:
- Voice calls are billed per minute
- API requests have minimal costs
- Set up usage alerts in Twilio Console
- Consider call recording costs if enabled

## Advanced Configuration

### Custom Call Routing
Modify `voice-router` function to implement:
- Time-based routing
- Skill-based agent assignment
- Geographic routing

### Call Recording
Enable call recording in Twilio:
1. Update TwiML to include `<Record>` verb
2. Store recording URLs in `call_logs.recording_url`
3. Implement recording access controls

### IVR Integration
Add Interactive Voice Response:
1. Create additional TwiML bins in Twilio
2. Update webhook logic for menu navigation
3. Log IVR interactions in database

## API Reference

### Edge Functions

#### get-voice-token
- **Method**: GET
- **Auth**: Bearer token required
- **Returns**: `{ token: string, identity: string }`

#### voice-router
- **Method**: POST
- **Body**: Twilio webhook form data
- **Returns**: TwiML XML response

#### voice-status
- **Method**: POST
- **Body**: Twilio status callback form data
- **Returns**: Empty 200 response

### Database Tables

#### call_logs
```sql
- id: uuid (primary key)
- company_id: uuid (foreign key)
- agent_id: uuid (foreign key)
- lead_id: uuid (foreign key)
- direction: text ('incoming' | 'outgoing')
- status: text
- duration: integer (seconds)
- recording_url: text
- twilio_call_sid: text
- created_at: timestamp
- updated_at: timestamp
- completed_at: timestamp
```

## Support

For issues with:
- **Twilio Configuration**: Check Twilio documentation
- **Database Issues**: Verify migration completion
- **Frontend Problems**: Check browser console logs
- **Edge Functions**: Monitor Supabase function logs

## Next Steps

1. Test the complete integration with test calls
2. Configure call recording if needed
3. Set up monitoring and alerting
4. Train agents on the telephony interface
5. Consider advanced features like call queues or conferencing