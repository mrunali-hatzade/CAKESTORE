const http = require('http');

const payload = JSON.stringify({
  customerName: 'John Smith (Example)',
  customerMobile: '8888888888',
  customerEmail: 'john@example.com',
  occasion: 'Wedding',
  requiredDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  servings: 50,
  cakeType: 'Tiered Fondant',
  flavour: 'Vanilla and Raspberry',
  designDescription: 'A 3-tier rustic floral cake with gold leaf detailing.',
  budget: 7500,
  referenceImageUrl: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80',
  deliveryPreference: 'DOORSTEP_DELIVERY'
});

const req = http.request({
  hostname: 'localhost',
  port: 8080,
  path: '/api/storefront/shops/17/custom-cakes',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': payload.length
  }
}, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`BODY: ${body}`);
  });
});

req.write(payload);
req.end();
