# Security Notes for ZeaWatch

## 🔒 API Keys and Secrets

**IMPORTANT:** Never commit API keys or secrets to version control!

### Protected Files

The following files contain sensitive information and are excluded from git:
- `backend/.env` - Contains Supabase URL, Supabase key, and Gemini API key
- `frontend/.env.local` - Contains Supabase URL and API URL

### Setup Scripts

The setup scripts (`setup-env.ps1` and `setup-env.sh`) contain hardcoded API keys for convenience. 

**Before pushing to GitHub:**
1. Review these scripts and remove them, OR
2. Add them to `.gitignore` (see commented section)

### Safe to Commit

These files are safe and should be committed:
- `.env.example` files (template files without real keys)
- `QUICK_START.md` (instructions)
- `README.md`
- All source code files

## 🔑 Regenerating API Keys

If you accidentally commit secrets:

1. **Immediately regenerate your API keys:**
   - Supabase: Dashboard → Settings → API → Reset keys
   - Gemini: Google AI Studio → Create new key

2. **Remove secrets from git history:**
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch backend/.env frontend/.env.local" \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. **Update your local .env files with new keys**

## ✅ Verification

Before pushing to GitHub, verify secrets are ignored:

```bash
# Check if .env files are ignored
git check-ignore -v backend/.env frontend/.env.local

# List all ignored files
git status --ignored

# Verify no secrets in staged files
git diff --cached | findstr /i "api_key\|supabase\|gemini"
```

## 📝 Best Practices

1. Always use `.env.example` files as templates
2. Never hardcode secrets in source code
3. Use environment variables for all sensitive data
4. Review all files before committing
5. Use git secrets scanning tools in CI/CD

