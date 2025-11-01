// server.js - UPDATED WITH MULTIPLE ROUTES
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

// In-memory storage (replace with database in production)
const subscribers = [];
const newsArticles = [
  { id: 1, title: 'New Product Launch', content: 'We are excited to announce our new product line!', date: '2024-11-01' },
  { id: 2, title: 'Holiday Sale Coming Soon', content: 'Get ready for our biggest sale of the year!', date: '2024-10-28' },
  { id: 3, title: 'Store Updates', content: 'We have made improvements to our checkout process.', date: '2024-10-25' }
];

// Verify the proxy request is from Shopify
function verifyProxyRequest(query) {
  const { signature, ...params } = query;
  console.log(query, "Query");
  
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

// ============================================
// NEWS ROUTE - GET
// ============================================
app.get('/proxy/news', (req, res) => {
  if (!verifyProxyRequest(req.query)) {
    console.log('Unauthorized request attempt');
    return res.status(401).send('Unauthorized');
  }
  
  const { shop, customer_id, logged_in } = req.query;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>News - ${shop}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        .news-item { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .news-item h2 { margin-top: 0; color: #333; }
        .news-date { color: #666; font-size: 0.9em; }
      </style>
    </head>
    <body>
      <h1>Latest News</h1>
      ${logged_in === 'true' ? `<p>Welcome back, Customer #${customer_id}!</p>` : '<p>Welcome, Guest!</p>'}
      ${newsArticles.map(article => `
        <div class="news-item">
          <h2>${article.title}</h2>
          <p class="news-date">${article.date}</p>
          <p>${article.content}</p>
        </div>
      `).join('')}
    </body>
    </html>
  `;
  
  res.send(html);
});

// ============================================
// SUBSCRIBE ROUTE - GET (Show form)
// ============================================
app.get('/proxy/subscribe', (req, res) => {
  if (!verifyProxyRequest(req.query)) {
    console.log('Unauthorized request attempt');
    return res.status(401).send('Unauthorized');
  }
  
  const { shop, customer_id, logged_in } = req.query;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Subscribe - ${shop}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
        .form-group { margin: 15px 0; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input[type="text"], input[type="email"] { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        button { background-color: #5c6ac4; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
        button:hover { background-color: #4959bd; }
        .success { color: green; padding: 10px; background: #d4edda; border-radius: 4px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <h1>Subscribe to Our Newsletter</h1>
      <p>Stay updated with our latest news and offers!</p>
      
      <form id="subscribeForm">
        <div class="form-group">
          <label for="name">Name:</label>
          <input type="text" id="name" name="name" required>
        </div>
        
        <div class="form-group">
          <label for="email">Email:</label>
          <input type="email" id="email" name="email" required>
        </div>
        
        <button type="submit">Subscribe</button>
      </form>
      
      <div id="message"></div>
      
      <script>
        document.getElementById('subscribeForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const formData = new FormData(e.target);
          const data = Object.fromEntries(formData);
          
          try {
            const response = await fetch(window.location.pathname + window.location.search, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
              document.getElementById('message').innerHTML = '<div class="success">' + result.message + '</div>';
              e.target.reset();
            }
          } catch (error) {
            console.error('Error:', error);
          }
        });
      </script>
    </body>
    </html>
  `;
  
  res.send(html);
});

// ============================================
// SUBSCRIBE ROUTE - POST (Handle submission)
// ============================================
app.post('/proxy/subscribe', (req, res) => {
  if (!verifyProxyRequest(req.query)) {
    console.log('Unauthorized POST request attempt');
    return res.status(401).send('Unauthorized');
  }
  
  const { name, email } = req.body;
  const { shop, customer_id } = req.query;
  
  // Check if already subscribed
  const existingSubscriber = subscribers.find(sub => sub.email === email);
  
  if (existingSubscriber) {
    return res.json({ success: false, message: 'This email is already subscribed!' });
  }
  
  // Add subscriber
  const subscriber = {
    id: subscribers.length + 1,
    name,
    email,
    shop,
    customer_id: customer_id || null,
    subscribed_at: new Date().toISOString()
  };
  
  subscribers.push(subscriber);
  
  console.log('New subscriber:', subscriber);
  console.log('Total subscribers:', subscribers.length);
  
  // In production, save to database and send confirmation email
  
  res.json({ success: true, message: 'Thank you for subscribing!' });
});

// ============================================
// PRODUCTS ROUTE - GET
// ============================================
app.get('/proxy/products', (req, res) => {
  if (!verifyProxyRequest(req.query)) {
    console.log('Unauthorized request attempt');
    return res.status(401).send('Unauthorized');
  }
  
  const { shop, customer_id, logged_in } = req.query;
  
  // Sample products (in production, fetch from Shopify API or database)
  const featuredProducts = [
    { id: 1, name: 'Premium Widget', price: '$29.99', image: 'https://via.placeholder.com/200' },
    { id: 2, name: 'Deluxe Gadget', price: '$49.99', image: 'https://via.placeholder.com/200' },
    { id: 3, name: 'Ultimate Tool', price: '$79.99', image: 'https://via.placeholder.com/200' }
  ];
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Featured Products - ${shop}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 1000px; margin: 0 auto; }
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; margin-top: 20px; }
        .product-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; text-align: center; }
        .product-card img { width: 100%; height: 200px; object-fit: cover; border-radius: 4px; }
        .product-name { font-weight: bold; margin: 10px 0; }
        .product-price { color: #5c6ac4; font-size: 1.2em; }
        .buy-button { background-color: #5c6ac4; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px; }
        .buy-button:hover { background-color: #4959bd; }
      </style>
    </head>
    <body>
      <h1>Featured Products</h1>
      ${logged_in === 'true' ? `<p>Special offers for Customer #${customer_id}!</p>` : '<p>Log in to see personalized recommendations!</p>'}
      
      <div class="products-grid">
        ${featuredProducts.map(product => `
          <div class="product-card">
            <img src="${product.image}" alt="${product.name}">
            <div class="product-name">${product.name}</div>
            <div class="product-price">${product.price}</div>
            <button class="buy-button" onclick="addToCart(${product.id})">Add to Cart</button>
          </div>
        `).join('')}
      </div>
      
      <script>
        function addToCart(productId) {
          alert('Product ' + productId + ' added to cart!');
          // In production, integrate with Shopify Cart API
        }
      </script>
    </body>
    </html>
  `;
  
  res.send(html);
});

// ============================================
// DEFAULT PROXY ROUTE (Fallback)
// ============================================
app.get('/proxy', (req, res) => {
  if (!verifyProxyRequest(req.query)) {
    console.log('Unauthorized request attempt');
    return res.status(401).send('Unauthorized');
  }
  
  const { shop } = req.query;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>App Proxy - ${shop}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        .link-card { padding: 20px; margin: 15px 0; border: 1px solid #ddd; border-radius: 8px; text-decoration: none; display: block; color: #333; }
        .link-card:hover { background-color: #f5f5f5; }
        .link-card h2 { margin-top: 0; color: #5c6ac4; }
      </style>
    </head>
    <body>
      <h1>Welcome to Our App</h1>
      <p>Choose a section:</p>
      
      <a href="/apps/api/news" class="link-card">
        <h2>📰 News</h2>
        <p>Read our latest updates and announcements</p>
      </a>
      
      <a href="/apps/api/subscribe" class="link-card">
        <h2>✉️ Subscribe</h2>
        <p>Subscribe to our newsletter for exclusive offers</p>
      </a>
      
      <a href="/apps/api/products" class="link-card">
        <h2>🛍️ Featured Products</h2>
        <p>Check out our handpicked product selection</p>
      </a>
    </body>
    </html>
  `;
  
  res.send(html);
});

// ============================================
// ADMIN ENDPOINT - View subscribers (for testing)
// ============================================
app.get('/admin/subscribers', (req, res) => {
  res.json({
    total: subscribers.length,
    subscribers: subscribers
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`App proxy server running on port ${PORT}`);
  console.log(`Available routes:`);
  console.log(`  - /proxy (home)`);
  console.log(`  - /proxy/news`);
  console.log(`  - /proxy/subscribe`);
  console.log(`  - /proxy/products`);
  console.log(`  - /admin/subscribers (testing only)`);
});
