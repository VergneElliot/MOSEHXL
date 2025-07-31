# Fix TypeScript Syntax Errors in Legal Routes

The TypeScript compiler is having issues with the object literal syntax. Here's how to fix it:

## Step 1: Connect to Your Server

```bash
ssh root@209.38.223.92
```

## Step 2: Fix the Legal Routes File

Edit the legal.ts file:

```bash
cd /var/www/MOSEHXL/MuseBar/backend/src/routes
nano legal.ts
```

## Step 3: Find and Fix the First Error (around line 2105)

Find this section:
```typescript
    if (printResult.success) {
      res.json({ 
        success: true, 
        message: printResult.message,
        receipt_data: thermalPrintData,
        receipt_content: printResult.receipt_content
      });
    }
```

And replace it with:
```typescript
    if (printResult.success) {
      res.json({ 
        success: true, 
        message: printResult.message,
        receipt_data: thermalPrintData,
        receipt_content: printResult.receipt_content || undefined
      });
    }
```

## Step 4: Find and Fix the Second Error (around line 2181)

Find this section:
```typescript
    if (printResult.success) {
      res.json({ 
        success: true, 
        message: printResult.message,
        bulletin_data: thermalPrintData,
        bulletin_content: printResult.bulletin_content
      });
    }
```

And replace it with:
```typescript
    if (printResult.success) {
      res.json({ 
        success: true, 
        message: printResult.message,
        bulletin_data: thermalPrintData,
        bulletin_content: printResult.bulletin_content || undefined
      });
    }
```

## Step 5: Alternative Fix - Use Type Assertion

If the above doesn't work, try this alternative approach. Replace both sections with:

For the receipt section:
```typescript
    if (printResult.success) {
      const response: any = { 
        success: true, 
        message: printResult.message,
        receipt_data: thermalPrintData
      };
      if (printResult.receipt_content) {
        response.receipt_content = printResult.receipt_content;
      }
      res.json(response);
    }
```

For the bulletin section:
```typescript
    if (printResult.success) {
      const response: any = { 
        success: true, 
        message: printResult.message,
        bulletin_data: thermalPrintData
      };
      if (printResult.bulletin_content) {
        response.bulletin_content = printResult.bulletin_content;
      }
      res.json(response);
    }
```

## Step 6: Build and Test

```bash
cd /var/www/MOSEHXL/MuseBar/backend
npm run build
```

If the build succeeds, restart the service:
```bash
pm2 restart musebar-backend
```

## Step 7: Test the Fix

```bash
# Test the thermal print endpoint
curl -X POST "http://localhost:3001/api/legal/receipt/754/thermal-print?type=detailed" \
  -H "Content-Type: application/json"
```

## Alternative: Complete File Replacement

If the above doesn't work, you can replace the entire legal.ts file. Here's a simpler approach:

1. Backup the current file:
```bash
cp /var/www/MOSEHXL/MuseBar/backend/src/routes/legal.ts /var/www/MOSEHXL/MuseBar/backend/src/routes/legal.ts.backup2
```

2. Remove the problematic lines and rebuild:
```bash
cd /var/www/MOSEHXL/MuseBar/backend/src/routes
sed -i '/receipt_content: printResult.receipt_content/d' legal.ts
sed -i '/bulletin_content: printResult.bulletin_content/d' legal.ts
```

3. Build and test:
```bash
cd /var/www/MOSEHXL/MuseBar/backend
npm run build
pm2 restart musebar-backend
```

This will remove the optional properties but keep the core functionality working. The thermal printer will still work correctly in server environments, just without returning the generated content. 