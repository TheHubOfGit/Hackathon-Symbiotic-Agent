# Environment Variables Setup Guide

## For Firebase Functions Deployment (Production)

Use the Firebase CLI to set environment variables:

```bash
# Navigate to your project root
cd c:\Users\Youssef\Documents\AppData\Local\Hackathon-Symbiotic-Agent

# Set AI API Keys
firebase functions:config:set gemini.api_key="your_actual_gemini_api_key"
firebase functions:config:set openai.api_key="your_actual_openai_api_key" 
firebase functions:config:set claude.api_key="your_actual_claude_api_key"

# Optional: Set GitHub webhook secret
firebase functions:config:set github.webhook_secret="your_webhook_secret"

# Deploy with the new config
firebase deploy --only functions
```

## For Local Development

1. Copy the `.env.example` file to `.env` in the functions directory:
```bash
cd functions
copy .env.example .env
```

2. Edit the `.env` file with your actual API keys:
```env
GEMINI_API_KEY=your_actual_gemini_api_key
OPENAI_API_KEY=your_actual_openai_api_key
CLAUDE_API_KEY=your_actual_claude_api_key
GITHUB_WEBHOOK_SECRET=your_webhook_secret
DEBUG=false
```

3. Install dotenv for local development:
```bash
npm install dotenv
```

## Where to Get API Keys

### 1. Google Gemini API Key
- Go to: https://makersuite.google.com/app/apikey
- Create a new API key
- Enable the Generative AI API

### 2. OpenAI API Key  
- Go to: https://platform.openai.com/api-keys
- Create a new secret key
- Add billing information if needed

### 3. Anthropic Claude API Key
- Go to: https://console.anthropic.com/
- Create an account and get API access
- Generate an API key

### 4. GitHub Webhook Secret (Optional)
- Generate a random string for webhook verification
- Or use: `openssl rand -base64 32`

## Important Notes

1. **GitHub Tokens**: These are provided by users through the frontend interface, NOT environment variables
2. **Never commit**: API keys to version control
3. **Firebase Config**: Automatically available to deployed functions
4. **Local Development**: Requires `.env` file for the emulator

## Testing the Setup

After setting up the keys, test by:
1. Deploying the functions: `firebase deploy --only functions`
2. Testing the GitHub integration in your dashboard
3. Checking the Firebase Functions logs for any API key errors

## Security Best Practices

- Use Firebase Functions config for production (encrypted)
- Use `.env` files only for local development  
- Rotate API keys regularly
- Monitor API usage and costs
- Set up billing alerts for AI providers
