# WhatsApp Integration - Local Development Setup

This guide shows how to set up WhatsApp integration for local development using cloudflared tunnel.

## Prerequisites

1. **Database Migration Applied** - Run the WhatsApp migration in Supabase Dashboard first
2. **Edge Function Deployed** - Deploy the `whatsapp-webhook` function to Supabase
3. **cloudflared Installed** - Download from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/

## Step 1: Start Your Development Server

Your Vite project runs on port **8080**. Start it with:

```bash
npm run dev
```

The server will be available at `http://localhost:8080`

## Step 2: Create Cloudflare Tunnel (Optional)

**IMPORTANT:** The cloudflared tunnel is only needed if you want to access your local React app remotely for development. The WhatsApp webhook will work without it.

If you want to access your local CRM remotely, run:

```bash
cloudflared tunnel --url http://localhost:8080
```

This gives you a temporary URL to access your local app from anywhere.

## Step 3: Configure Twilio Webhook

**🚨 CRITICAL: DO NOT USE TUNNEL URL FOR WEBHOOKS!**

Twilio webhooks must point directly to your **Supabase Edge Function**, not your local tunnel.

**Correct Webhook URL for Twilio:** `https://your-project.supabase.co/functions/v1/whatsapp-webhook`

**❌ WRONG (Don't do this):** `https://cards-seller-mistakes-small.trycloudflare.com/functions/v1/whatsapp-webhook`

**Why?**
- Your tunnel only exposes your local React app
- WhatsApp webhooks need to reach your Supabase Edge Function 24/7
- Local tunnels are temporary and unreliable for production webhooks

Replace `your-project` with your actual Supabase project ID.

## Step 4: Configure Twilio Webhook

1. Go to your [Twilio Console](https://console.twilio.com)
2. Navigate to **WhatsApp → Senders**
3. Click on your WhatsApp number
4. In the **"Webhook URL"** field, paste: `https://abc123-random-name.trycloudflare.com/functions/v1/whatsapp-webhook`
5. Set method to **POST**
6. Click **Save**

## Step 5: Test the Integration

1. **Configure WhatsApp Settings in CRM:**
   - Go to Company Settings → WhatsApp Business Integration
   - Enter your Twilio Account SID, Auth Token, and WhatsApp number
   - Save the settings

2. **Send a Test Message:**
   - Send a WhatsApp message to your business number
   - Check the WhatsApp Inbox in your CRM
   - You should see the message appear instantly

## Troubleshooting

### Tunnel Connection Issues
```bash
# Check if cloudflared is running
ps aux | grep cloudflared

# Restart tunnel if needed
cloudflared tunnel --url http://localhost:8080
```

### Messages Not Appearing
- Ensure database migration was applied
- Check Edge Function logs in Supabase Dashboard
- Verify Twilio webhook URL is correct
- Check that WhatsApp settings are saved in CRM

### Port Issues
- Confirm your dev server is running on port 8080
- Check if another process is using port 8080

## Security Notes

- **Development Only:** This tunnel setup is for development/testing
- **Temporary URL:** The tunnel URL changes each time you restart cloudflared
- **HTTPS:** cloudflared automatically provides HTTPS encryption
- **Local Access:** Only you can access your local server through this tunnel

## Next Steps for Production

For production deployment, set up a permanent Cloudflare Tunnel:

1. Create a permanent tunnel: `cloudflared tunnel create whatsapp-prod`
2. Configure DNS records in Cloudflare
3. Use a custom domain for the webhook URL
4. Update Twilio with the production webhook URL

**The integration is now ready for local development testing! 🚀**</contents>
</xai:function_call">LOCAL_DEVELOPMENT_SETUP.md
