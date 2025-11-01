// server.js - CORRECTED VERSION
require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const app = express();

// Middleware to parse request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Your Shopify app secret (from Partner Dashboard)
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;

// Validate environment variable
if (!SHOPIFY_API_SECRET) {
  console.error('ERROR: SHOPIFY_API_SECRET is not set in environment variables');
  process.exit(1);
}

// Verify the proxy request is from Shopify
function verifyProxyRequest(query) {
  const { signature, ...params } = query;
  console.log(query, "Query")
  
  if (!signature) {
    console.log('No signature provided');
    return false;
  }
  
  // Sort parameters and create query string
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('');

    console.log('Sorted Params:', sortedParams);
  
  // Generate HMAC
  const hash = crypto
    .createHmac('sha256', SHOPIFY_API_SECRET)
    .update(sortedParams)
    .digest('hex');
  
  return hash === signature;
}

// App Proxy endpoint
app.get('/proxy', (req, res) => {
  // Verify request is from Shopify
  if (!verifyProxyRequest(req.query)) {
    console.log('Unauthorized request attempt');
    return res.status(401).send('Unauthorized');
  }
  
  // Extract Shopify parameters
  const {
    shop,           // Store domain
    path_prefix,    // /apps
    subpath,        // /news
    customer_id,    // Customer ID (if logged in)
    logged_in,      // true/false
    timestamp,
  } = req.query;
  //console.log('Proxy request verified', req);
  
  console.log('Shop:', shop);
  console.log('Customer ID:', customer_id);
  console.log('Logged in:', logged_in);
  
  // Return HTML/JSON response
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>News - ${shop}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .news-item { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <h1>Latest News</h1>
      <div class="news-item">
        <h2>Welcome to our news page!</h2>
        <p>This content is served via Shopify App Proxy.</p>
        <p>Shop: ${shop}</p>
        ${logged_in === 'true' ? `<p>Customer ID: ${customer_id}</p>` : '<p>Not logged in</p>'}
      </div>
    </body>
    </html>
  `;
  
  res.send(html);
});

// POST endpoint for form submissions
app.post('/proxy', (req, res) => {
  if (!verifyProxyRequest(req.query)) {
    console.log('Unauthorized POST request attempt');
    return res.status(401).send('Unauthorized');
  }
  
  const formData = req.body;
  console.log('Form data:', formData);
  
  // Process form data here
  
  res.json({ success: true, message: 'Form submitted successfully' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`App proxy server running on port ${PORT}`);
});
