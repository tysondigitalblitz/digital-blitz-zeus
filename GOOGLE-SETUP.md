# Google Ads Account Setup Guide for Zeus

This guide will walk you through setting up your Google Ads account with Zeus for offline conversion tracking.

## Prerequisites

- ✅ Active Google Ads account with Enhanced Conversions enabled
- ✅ Admin access to your Google Ads account
- ✅ At least one conversion action set up in Google Ads

---

## Step 1: Find Your Customer ID

Your Customer ID is your unique Google Ads account identifier.

### How to Find It:
1. **Log into Google Ads** at [ads.google.com](https://ads.google.com)
2. **Look at the top right corner** of the screen
3. **Copy the number** in format: `123-456-7890`

![Customer ID Location](https://support.google.com/google-ads/answer/1704344?hl=en#zippy=%2Cfind-your-customer-id)

### Important Notes:
- ⚠️ **Keep the dashes** - Format must be `123-456-7890`, not `1234567890`
- ⚠️ **Use the Customer ID, not the account name**
- ⚠️ **If you have multiple accounts**, make sure you're looking at the right one

---

## Step 2: Set Up a Conversion Action

You need a conversion action to track offline purchases.

### If You Don't Have One:
1. Go to **Tools & Settings** → **Conversions**
2. Click the **"+" (Plus)** button
3. Select **"Import"** → **"Other data sources or CRMs"**
4. Click **"Track conversions from clicks"**
5. Set up your conversion:
   - **Conversion name**: "Offline Purchase" or "Phone Lead"
   - **Category**: Choose appropriate category (Purchase, Lead, etc.)
   - **Value**: Set how you want to track value
   - **Count**: Usually "One" for purchases
6. Click **"Create and continue"**
7. **Enable Enhanced Conversions** (very important!)

### If You Already Have One:
1. Go to **Tools & Settings** → **Conversions**
2. Find your conversion action
3. **Make sure Enhanced Conversions is enabled**
4. Note the conversion name for later

---

## Step 3: Get Your Conversion Action ID

This is the unique identifier for your specific conversion action.

### How to Find It:
1. Go to **Tools & Settings** → **Conversions**
2. **Click on your conversion action** (the one you want to use for offline tracking)
3. **Look at the URL** in your browser
4. **Find the number after `ocid=`**

Example URL:
```
https://ads.google.com/aw/conversions/detail?ocid=6936014364&ascid=...
```
Your Conversion Action ID is: `6936014364`

### Important Notes:
- ✅ **Copy only the numbers** - No letters or symbols
- ✅ **This is different from the conversion name**
- ✅ **Each conversion action has a unique ID**

---

## Step 4: Enable Enhanced Conversions

Enhanced Conversions is required for Zeus to work properly.

### How to Enable:
1. **Go to your conversion action** (from Step 3)
2. **Click "Settings"** in the left sidebar
3. **Scroll down to "Enhanced conversions"**
4. **Turn on enhanced conversions**
5. **Select "Google Ads API"** as your method
6. **Click "Save"**

### Verification:
- ✅ You should see "Enhanced conversions: On" in your conversion action
- ✅ Method should show "Google Ads API"

---

## Step 5: Add Account to Zeus

Now you have all the information needed to set up Zeus.

### In Zeus:
1. **Go to Google Ads Settings** in Zeus
2. **Click "Add Google Ads Account"**
3. **Fill in the form**:
   - **Business**: Select your business
   - **Customer ID**: `123-456-7890` (from Step 1)
   - **Account Name**: "My Business Google Ads" (whatever you want)
   - **Conversion Action ID**: `6936014364` (from Step 3)
   - **Conversion Action Name**: "Offline Purchase" (from Step 2)
4. **Click "Add Account"**

---

## Step 6: Connect OAuth

Zeus needs permission to access your Google Ads account via API.

### How to Connect:
1. **After adding your account**, you'll see "OAuth Not Connected"
2. **Click "Connect OAuth"**
3. **Sign in to Google** when prompted
4. **Grant permissions** to Zeus
5. **You'll be redirected back** to Zeus
6. **Verify** you see "OAuth Connected" ✅

### Troubleshooting OAuth:
- 🔴 **"Access denied"** - Make sure you're using the same Google account that has access to Google Ads
- 🔴 **"Invalid redirect"** - Contact your Zeus administrator
- 🔴 **"App not verified"** - This is normal, click "Advanced" → "Go to Zeus"

---

## Step 7: Test Your Setup

Verify everything is working correctly.

### Test Connection:
1. **Click the "Test" button** next to your account in Zeus
2. **Should show** ✅ "Account connection test successful!"
3. **If it fails**, double-check your Customer ID and Conversion Action ID

### Test Upload:
1. **Go to the Upload page** in Zeus
2. **Create a test CSV** with sample data:
   ```csv
   email,phone,first_name,last_name,purchase_amount,purchase_date,order_id
   test@example.com,555-1234,John,Doe,100.00,2025-01-28,TEST-001
   ```
3. **Upload the file**
4. **Select your business and Google Ads account**
5. **Enable "Auto-sync to Google Ads"**
6. **Click "Upload & Process"**

---

## Verification Checklist

Before going live, verify:

- ✅ **Customer ID** is correct (format: `123-456-7890`)
- ✅ **Conversion Action ID** is correct (numbers only)
- ✅ **Enhanced Conversions** is enabled in Google Ads
- ✅ **OAuth connection** shows as connected
- ✅ **Test connection** passes
- ✅ **Test upload** works without errors
- ✅ **Conversions appear** in Google Ads (Tools → Conversions → Your Action → Uploads tab)

---

## Common Issues & Solutions

### "Test failed: Invalid customer ID"
- ❌ Wrong Customer ID format
- ✅ Use format `123-456-7890` with dashes

### "Test failed: Conversion action not found"
- ❌ Wrong Conversion Action ID
- ✅ Double-check the `ocid=` number in your Google Ads URL

### "No conversions uploaded"
- ❌ Enhanced Conversions not enabled
- ✅ Enable Enhanced Conversions with "Google Ads API" method

### "OAuth connection failed"
- ❌ Using wrong Google account
- ✅ Use the Google account that has access to Google Ads

### "Access denied error"
- ❌ Google Ads API access not approved
- ✅ Your Zeus administrator needs to apply for Google Ads API access

---

## Support

If you encounter issues:

1. **Double-check** all IDs and settings using this guide
2. **Try the test function** in Zeus to verify connection
3. **Check Google Ads** to ensure Enhanced Conversions is enabled
4. **Contact your Zeus administrator** if problems persist

---

## Summary

You need these 4 pieces of information:

| Field | Example | Where to Find |
|-------|---------|---------------|
| **Customer ID** | `123-456-7890` | Top right corner of Google Ads |
| **Account Name** | "My Business Google Ads" | You choose this |
| **Conversion Action ID** | `6936014364` | URL when viewing conversion action (`ocid=`) |
| **Conversion Action Name** | "Offline Purchase" | You choose this (matches your conversion) |

Once you have these, adding your account to Zeus takes less than 2 minutes! 🚀