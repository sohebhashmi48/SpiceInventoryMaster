# WhatsApp Integration Setup Guide

## 🚨 Important: Fix "Phone number isn't on WhatsApp" Error

The error you're seeing occurs because the current phone number in the code (`+91 98765 43210`) is a placeholder/test number that is not registered on WhatsApp.

**Current Status**: The system is configured with a test number that doesn't exist on WhatsApp, which is why you're getting the error message.

## 🚀 Quick Fix (2 Minutes)

**If you already have WhatsApp on your phone:**

1. Open `client/src/config/business.ts`
2. Replace `number: '91XXXXXXXXXX'` with your actual WhatsApp number (without +)
   - Example: If your number is +91 98765 43210, use `'919876543210'`
3. Replace `displayNumber: '+91 XXXXXXXXXX'` with your number (with +)
   - Example: `'+91 98765 43210'`
4. Save the file and test again

## ✅ Complete Solution Steps

### Step 1: Get a WhatsApp Business Account

1. **Download WhatsApp Business** on your business mobile phone
2. **Register your business phone number** with WhatsApp Business
3. **Verify the number** through SMS/call verification
4. **Complete your business profile** with:
   - Business name: RoyalSpicyMasala
   - Business category: Food & Grocery
   - Business description
   - Business hours
   - Location

### Step 2: Update the Phone Number in Code

1. **Open the file**: `client/src/config/business.ts`

2. **Replace the placeholder numbers** with your actual WhatsApp Business number:

```typescript
// WhatsApp Configuration
whatsapp: {
  // Replace with your actual WhatsApp Business number (without + sign)
  number: '919876543210', // Example: if your number is +91 98765 43210
  // Display number (with + sign for display purposes)
  displayNumber: '+91 98765 43210' // Example: +91 98765 43210
},
```

3. **Also update the contact information**:

```typescript
// Contact Information
phone: '+91 98765 43210', // Your actual business phone number
```

### Step 3: Test the Integration

1. **Save the changes** and restart your development server
2. **Try placing a test order** through the showcase
3. **Verify** that WhatsApp opens with your business number

## 📱 WhatsApp Business Setup Checklist

- [ ] WhatsApp Business app installed on business phone
- [ ] Business phone number verified on WhatsApp
- [ ] Business profile completed
- [ ] Phone number updated in `client/src/config/business.ts`
- [ ] Contact information updated throughout the app
- [ ] Test order placement working

## 🔧 Alternative Solutions

### Option 1: Use Your Personal WhatsApp (Temporary)
If you don't have WhatsApp Business yet, you can temporarily use your personal WhatsApp number:

1. Make sure your personal number is registered on WhatsApp
2. Update the number in the config file
3. Test the integration

### Option 2: Use a Different Business Number
If you have multiple business numbers:

1. Choose the number that is registered on WhatsApp
2. Update the config file with that number
3. Ensure the number is active and can receive messages

## 📋 Common Issues & Solutions

### Issue: "Phone number isn't on WhatsApp"
**Solution**: The number must be registered on WhatsApp/WhatsApp Business

### Issue: WhatsApp opens but shows wrong number
**Solution**: Check that you removed the `+` sign from the `number` field in config

### Issue: Message format looks wrong
**Solution**: The message formatting is handled automatically by our utility functions

## 🎯 Best Practices

1. **Use WhatsApp Business** for professional appearance
2. **Set up automated responses** for common queries
3. **Configure business hours** in WhatsApp Business
4. **Add a business catalog** if needed
5. **Enable message templates** for faster responses

## 📞 Example Configuration

Here's how your config should look with a real number:

```typescript
// Example with actual number
whatsapp: {
  number: '919876543210',        // Your WhatsApp number without +
  displayNumber: '+91 98765 43210' // Same number with + for display
},
```

## 🚀 After Setup

Once you've updated the phone number:

1. **Restart your development server**
2. **Clear browser cache** if needed
3. **Test order placement** from the showcase
4. **Verify WhatsApp opens** with correct number and message

## 📧 Need Help?

If you continue to face issues:

1. **Verify** your WhatsApp Business setup
2. **Double-check** the phone number format in the config
3. **Test** with a simple WhatsApp URL manually: `https://wa.me/919876543210`
4. **Ensure** the number is active and can receive messages

---

**Note**: Replace `919876543210` with your actual WhatsApp Business number throughout this guide.
