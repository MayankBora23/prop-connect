# Cloudflare Tunnel Setup for Twilio WhatsApp Webhook

This guide will help you set up a Cloudflare Tunnel to securely connect your Twilio WhatsApp webhook to your Supabase Edge Function.

## Prerequisites

1. A Cloudflare account
2. `cloudflared` CLI installed on your local machine
3. A domain managed by Cloudflare (optional but recommended)

## Step 1: Install cloudflared

### Windows
```powershell
# Download and install cloudflared
winget install --id Cloudflare.cloudflared
```

### macOS
```bash
# Using Homebrew
brew install cloudflare/cloudflare/cloudflared

# Or download manually
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz | tar xz
sudo mv cloudflared /usr/local/bin
```

### Linux
```bash
# Download and install
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
```

## Step 2: Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This will open your browser and prompt you to log in to your Cloudflare account. Select the domain you want to use.

## Step 3: Create a Tunnel

```bash
cloudflared tunnel create whatsapp-webhook
```

Replace `whatsapp-webhook` with your preferred tunnel name. This creates a tunnel that will route traffic to your Supabase Edge Function.

## Step 4: Create a Configuration File

Create a file named `config.yaml` in your project root:

```yaml
tunnel: whatsapp-webhook
credentials-file: ~/.cloudflared/credentials.json

ingress:
  - hostname: whatsapp-webhook.yourdomain.com
    service: https://your-project.supabase.co
    originRequest:
      httpHostHeader: your-project.supabase.co
  - service: http_status:404
```

**Important Notes:**
- Replace `whatsapp-webhook.yourdomain.com` with your actual domain
- Replace `your-project.supabase.co` with your actual Supabase project URL
- The `httpHostHeader` ensures requests are properly routed to Supabase

## Step 5: Create DNS Record

Add a DNS record in your Cloudflare dashboard:

1. Go to your Cloudflare Dashboard
2. Select your domain
3. Go to DNS → Records
4. Click "Add record"
5. Set:
   - Type: `CNAME`
   - Name: `whatsapp-webhook` (or your preferred subdomain)
   - Target: The tunnel UUID (you can get this from `cloudflared tunnel list`)
   - Proxy status: `Proxied`

## Step 6: Route the Tunnel

```bash
cloudflared tunnel route dns whatsapp-webhook whatsapp-webhook.yourdomain.com
```

This creates the DNS record automatically if you have the necessary permissions.

## Step 7: Start the Tunnel

```bash
cloudflared tunnel run whatsapp-webhook
```

For production use, you should run this as a service. Here are the instructions for different platforms:

### Linux (systemd)
```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

### Windows
Create a Windows service using NSSM or run as a scheduled task.

### macOS
```bash
# Create a plist file for launchd
sudo cloudflared service install
```

## Step 8: Test the Tunnel

Test that your tunnel is working:

```bash
curl https://whatsapp-webhook.yourdomain.com/functions/v1/whatsapp-webhook
```

You should receive a response from your Supabase Edge Function.

## Step 9: Configure Twilio Webhook

1. Go to your Twilio Console
2. Navigate to WhatsApp → Senders
3. Click on your WhatsApp number
4. In the "Webhook URL" field, enter:
   ```
   https://whatsapp-webhook.yourdomain.com/functions/v1/whatsapp-webhook
   ```
5. Set the method to `POST`
6. Save the configuration

## Alternative: Using ngrok (Simpler for Development)

If you prefer a simpler setup for development/testing:

1. Install ngrok: `npm install -g ngrok`
2. Start ngrok: `ngrok http 54321` (or your local development port)
3. Use the ngrok URL as your webhook URL in Twilio:
   ```
   https://abc123.ngrok.io/functions/v1/whatsapp-webhook
   ```

## Troubleshooting

### Tunnel Connection Issues
```bash
# Check tunnel status
cloudflared tunnel list

# View tunnel logs
cloudflared tunnel logs whatsapp-webhook
```

### DNS Issues
- Ensure your DNS record is properly configured
- Check that the tunnel is running: `cloudflared tunnel list`
- Verify the domain is active in Cloudflare

### Supabase CORS Issues
If you encounter CORS issues, ensure your Edge Function includes proper CORS headers (which it already does in our implementation).

### Twilio Signature Validation
The Edge Function automatically validates Twilio signatures. If validation fails:
- Ensure your Twilio credentials are correct in the WhatsApp settings
- Check that the webhook URL matches exactly what Twilio is sending to

## Security Considerations

1. **HTTPS Only**: Cloudflare Tunnel ensures all traffic is encrypted
2. **Signature Validation**: The Edge Function validates Twilio's X-Twilio-Signature header
3. **Rate Limiting**: Consider implementing rate limiting in your Edge Function for production use
4. **Monitoring**: Set up monitoring for your tunnel and webhook endpoints

## Cost Considerations

- Cloudflare Tunnel is free for basic usage
- Twilio WhatsApp charges per conversation and message
- Supabase Edge Functions have a generous free tier

## Next Steps

Once your tunnel is set up and Twilio is configured:

1. Configure your WhatsApp settings in the CRM (Company Settings → WhatsApp Business Integration)
2. Test sending messages through the WhatsApp Inbox
3. Monitor webhook logs in your Supabase Edge Function logs
4. Set up proper error handling and notifications

## Support

If you encounter issues:
1. Check the Supabase Edge Function logs
2. Verify tunnel connectivity with `cloudflared tunnel list`
3. Test the webhook URL directly with curl
4. Check Twilio's webhook delivery logs in their console
