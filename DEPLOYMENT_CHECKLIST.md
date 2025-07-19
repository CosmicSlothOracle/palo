# 🚀 KOSGE DEPLOYMENT CHECKLIST

## ✅ PRE-DEPLOYMENT VERIFICATION

### Frontend Build

- [x] React app builds successfully (`npm run build`)
- [x] TypeScript compilation passes (`npm run lint`)
- [x] All tests pass (`npm test`)
- [x] Assets built to `docs/react-app/`
- [x] Index.html has correct relative paths

### Backend API

- [x] Netlify functions handle all endpoints
- [x] Authentication works with JWT tokens
- [x] File uploads work with base64 encoding
- [x] CORS properly configured
- [x] Error handling in place

### Environment Variables

- [ ] `ADMIN_USERNAME` set in Netlify dashboard
- [ ] `ADMIN_PASSWORD_HASH` set in Netlify dashboard (generate with bcrypt)
- [ ] `JWT_SECRET` set in Netlify dashboard (long random string)
- [ ] `ALLOWED_ORIGIN` set if needed for CORS

## 🔧 DEPLOYMENT STEPS

### 1. Environment Setup

```bash
# Generate password hash for admin
python -c "import bcrypt; print(bcrypt.hashpw(b'YOUR_PASSWORD', bcrypt.gensalt()).decode())"

# Generate JWT secret
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2. Netlify Environment Variables

Set these in Netlify dashboard:

- `ADMIN_USERNAME`: admin
- `ADMIN_PASSWORD_HASH`: [generated hash]
- `JWT_SECRET`: [generated secret]
- `ALLOWED_ORIGIN`: \* (or specific domain)

### 3. Build Verification

- [ ] Frontend builds to `docs/react-app/`
- [ ] Netlify functions are in `netlify/functions/`
- [ ] All redirects configured in `netlify.toml`

## 🧪 POST-DEPLOYMENT TESTING

### Authentication

- [ ] Admin login works
- [ ] JWT tokens are generated correctly
- [ ] Logout clears tokens

### Event Management

- [ ] Create new events
- [ ] Edit existing events
- [ ] Delete events
- [ ] Upload event banners

### Banner Management

- [ ] Upload new banners
- [ ] List existing banners
- [ ] Delete banners
- [ ] Banner images display correctly

### Participant Management

- [ ] Public can participate in events
- [ ] Admin can view participants
- [ ] Export participants to CSV
- [ ] Data export works

### API Endpoints

- [ ] `/api/login` - Authentication
- [ ] `/api/events` - Event CRUD
- [ ] `/api/banners` - Banner management
- [ ] `/api/events/:id/participants` - Participant management
- [ ] `/api/events/:id/export` - Data export

## 🐛 KNOWN ISSUES & SOLUTIONS

### File Upload

- **Issue**: FormData not supported by Netlify functions
- **Solution**: ✅ Fixed to use base64 encoding

### CORS

- **Issue**: Potential CORS issues with different origins
- **Solution**: ✅ Properly configured in Netlify functions

### Build Output

- **Issue**: React app needs to be served from docs directory
- **Solution**: ✅ Configured Vite to build to docs/react-app

## 🎯 SUCCESS CRITERIA

- [ ] Admin can log in and access dashboard
- [ ] Events can be created, edited, and deleted
- [ ] Banners can be uploaded and managed
- [ ] Participants can register for events
- [ ] Data can be exported
- [ ] All functionality works in production

## 🚨 EMERGENCY ROLLBACK

If deployment fails:

1. Check Netlify function logs
2. Verify environment variables
3. Test API endpoints individually
4. Check CORS configuration
5. Verify file upload functionality

## 📝 DEPLOYMENT NOTES

- Frontend is served from `docs/react-app/index.html`
- API endpoints are handled by Netlify functions
- Static assets are served from `docs/`
- All redirects are configured in `netlify.toml`
