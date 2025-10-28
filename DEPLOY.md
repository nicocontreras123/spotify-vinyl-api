# 🚀 Deployment Guide - Spotify Vinyl API

## Deploy on Render.com

### Step 1: Create Web Service

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `spotify-vinyl-api`
4. Configure:
   - **Name**: `spotify-vinyl-api` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or your preferred plan)

### Step 2: Environment Variables

Add the following environment variables in Render dashboard:

```env
NODE_ENV=production
PORT=3000

# Spotify API
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://your-app.onrender.com/callback

# Discogs API (Optional)
DISCOGS_TOKEN=your_discogs_token

# CORS - Add your Vercel frontend URL
ALLOWED_ORIGINS=https://your-frontend.vercel.app

# Session Secret - Generate a random string
SESSION_SECRET=your_random_secret_here
```

### Step 3: Update Spotify Dashboard

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your app
3. Click "Edit Settings"
4. Add to "Redirect URIs":
   ```
   https://your-app.onrender.com/callback
   ```
5. Save

### Step 4: Deploy

1. Click "Create Web Service"
2. Wait for deployment (usually 2-5 minutes)
3. Your API will be available at: `https://your-app.onrender.com`

## Important Notes

⚠️ **Free Tier Limitations**:
- The service sleeps after 15 minutes of inactivity
- First request after sleep takes ~30 seconds
- 750 hours/month free

💡 **Tips**:
- Use the Render dashboard to view logs
- Test your endpoints at `https://your-app.onrender.com`
- Update `ALLOWED_ORIGINS` with your actual Vercel URL after deploying the frontend

## Testing

After deployment, test your API:

```bash
# Check if API is running
curl https://your-app.onrender.com

# Get auth URL
curl https://your-app.onrender.com/auth/login
```
