# SillasMesas Bot - Facebook Messenger Setup Guide

## Overview

This guide provides step-by-step instructions to configure the SillasMesas Messenger Bot webhook with your Facebook App and Page.

---

## Prerequisites

Before you begin, ensure you have:

- A Facebook Developer account (https://developers.facebook.com)
- A Facebook App created
- A Facebook Page for your business
- The following credentials (already configured in the bot):
  - **Page Access Token**: `EAANw8OzmZBUgBREbp1G8bX2ytZAZCPZCt42A39CJQC6QhDhZAJs7JWcBBPf91xBilsOWfZAvuiCmOWrLDCHJgRVS4Fw8ZB3qcaycWLtXnZCEoPzlvZAEdLm83DI6itxJmr0Hp3X6i8PPABpKfbPvJHsBnNcuKbYlenDDwOUtmDWA0y2SnlKVGUd1zJkHIyZArG3eg05lY8kZCoCCumvZCRxiSlrQQAlq5MIPOMjDnlyX21sh36JlYoldjAZDZD`
  - **App Secret**: `aa0f9e6e360dfec17630bbc493188ac7`
  - **Verify Token**: `sillasymesas_webhook_verify_token_2026`

---

## Bot URLs

| Component | URL |
|-----------|-----|
| **Webhook Endpoint** | `https://3000-ismuucs3he3m0igl3x2o8-a4673800.us2.manus.computer/api/webhook` |
| **Admin Dashboard** | `https://3000-ismuucs3he3m0igl3x2o8-a4673800.us2.manus.computer/dashboard` |
| **Health Check** | `https://3000-ismuucs3he3m0igl3x2o8-a4673800.us2.manus.computer/api/health` |

---

## Configuration Steps

### Step 1: Access Facebook Developer Console

1. Go to [Facebook Developers](https://developers.facebook.com)
2. Navigate to your App
3. Select **Messenger** from the left sidebar
4. Click on **Settings**

### Step 2: Configure Webhook URL

1. In the **Messenger Settings** page, find the **Webhooks** section
2. Click **Edit Subscription**
3. Enter the following information:

   | Field | Value |
   |-------|-------|
   | **Callback URL** | `https://3000-ismuucs3he3m0igl3x2o8-a4673800.us2.manus.computer/api/webhook` |
   | **Verify Token** | `sillasymesas_webhook_verify_token_2026` |
   | **Subscription Fields** | Select: `messages`, `messaging_postbacks`, `message_echoes` |

4. Click **Verify and Save**

### Step 3: Subscribe Page to Webhook

1. Still in **Messenger Settings**, scroll to the **Webhooks** section
2. Under **Select a Page to subscribe your webhook to the Page events**, select your page
3. Click **Subscribe**

### Step 4: Verify Webhook is Active

Test your webhook by making a GET request:

```bash
curl "https://3000-ismuucs3he3m0igl3x2o8-a4673800.us2.manus.computer/api/webhook?hub.mode=subscribe&hub.verify_token=sillasymesas_webhook_verify_token_2026&hub.challenge=test_challenge"
```

**Expected Response**: `test_challenge`

---

## Bot Features

### Automatic Responses

The bot automatically responds to user messages with:

- **Friendly, professional tone** with appropriate emojis
- **Business context** about Sillas y Mesas J.R in Pasto
- **Delivery information**: $25,000 within Pasto, direct contact for outside Pasto
- **Catalog link**: https://wondrous-sherbet-f6e838.netlify.app/ in every response
- **Conversation history** maintained per user for context-aware responses

### Supported Topics

The bot can help with:

- Product pricing and availability
- Delivery and logistics
- Reservation process
- Payment methods
- Cancellation policies
- Event setup and decorations
- General inquiries

---

## Admin Dashboard

### Access

- **URL**: `https://3000-ismuucs3he3m0igl3x2o8-a4673800.us2.manus.computer/dashboard`
- **Authentication**: Admin-only access (requires admin role in system)
- **Real-time Updates**: Dashboard polls every 5-10 seconds

### Dashboard Features

| Feature | Description |
|---------|-------------|
| **Statistics** | Total conversations, messages, success rate, error count |
| **Conversations** | Browse and search all user conversations |
| **Message History** | View full conversation history with timestamps |
| **Activity Log** | Monitor bot activity with status indicators |
| **Search/Filter** | Find conversations by user name or ID |
| **Manual Refresh** | Update all data on demand |

---

## Webhook Request Validation

All incoming webhook requests are validated using **HMAC-SHA256** signature verification:

1. Facebook sends requests with `X-Hub-Signature-256` header
2. Bot verifies signature using App Secret
3. Only valid requests are processed
4. Invalid requests are rejected with 403 Forbidden

---

## Message Flow

```
User sends message on Facebook Messenger
        ↓
Facebook sends webhook POST to /api/webhook
        ↓
Bot validates HMAC-SHA256 signature
        ↓
Bot retrieves conversation history
        ↓
Bot generates response using OpenAI (gpt-4.1-mini)
        ↓
Bot ensures catalog link is included
        ↓
Bot saves conversation to database
        ↓
Bot sends response back to user via Facebook Graph API
        ↓
Admin sees activity in dashboard
```

---

## Troubleshooting

### Webhook Verification Fails

**Problem**: "Verify and Save" button fails or shows error

**Solution**:
- Verify the Callback URL is exactly: `https://3000-ismuucs3he3m0igl3x2o8-a4673800.us2.manus.computer/api/webhook`
- Verify the Verify Token is exactly: `sillasymesas_webhook_verify_token_2026`
- Check that the bot server is running and accessible
- Test with curl command above

### Bot Not Responding to Messages

**Problem**: Users send messages but don't receive responses

**Solution**:
- Check that the Page is subscribed to the webhook
- Verify Page Access Token is valid
- Check bot activity log in dashboard for errors
- Ensure OpenAI API is configured and working

### Dashboard Not Loading

**Problem**: Dashboard shows "Acceso Denegado" or doesn't load

**Solution**:
- Ensure you're logged in as admin
- Check browser console for errors
- Verify database connection is active
- Try manual refresh button

---

## Security Best Practices

1. **Never share credentials**: Keep App Secret and tokens secure
2. **Use HTTPS**: All webhook communication uses HTTPS
3. **Verify signatures**: All incoming requests are HMAC-SHA256 verified
4. **Admin-only dashboard**: Dashboard access restricted to admin users
5. **Secure storage**: Conversation data stored in encrypted database

---

## Support

For issues or questions:

1. Check the bot activity log in the dashboard
2. Review error messages in the dashboard activity section
3. Test webhook connectivity with curl commands
4. Verify all credentials are correctly configured

---

## Next Steps

1. ✅ Configure webhook in Facebook Developer Console
2. ✅ Subscribe page to webhook
3. ✅ Test webhook connectivity
4. ✅ Send test message from Facebook Messenger
5. ✅ Monitor activity in admin dashboard
6. ✅ Customize bot responses if needed

---

**Bot Status**: ✅ Ready for Production

**Last Updated**: April 15, 2026

**Version**: 1.0.0
