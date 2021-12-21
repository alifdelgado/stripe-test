const express = require('express');
const app = express();
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SK);
const PORT = process.env.PORT;
const Shopify = require('shopify-api-node');
const shopifyAPI = require('shopify-node-api');

const shopifyConnector = new Shopify({
    shopName: process.env.SHOPIFY_SHOP,
    apiKey: process.env.SHOPIFY_KEY,
    password: process.env.SHOPIFY_PASS
});

const shopifyAuth = new shopifyAPI({
    shop: process.env.SHOPIFY_SHOP, // MYSHOP.myshopify.com
    shopify_api_key: process.env.SHOPIFY_KEY, // Your API key
    shopify_shared_secret: process.env.SHOPIFY_KEY_SECRET, // Your Shared Secret
    shopify_scope: 'write_products',
    redirect_uri: 'http://localhost:3000/finish_auth',
    nonce: '' // you must provide a randomly selected value unique for each authorization request
});

app.use(express.static('public'));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('it works!');
});

app.get('/stripe-key', (req, res) => {
    res.send({ publicKey: process.env.STRIPE_PK });
});

const generateResponse = (intent) => {
    switch(intent.status) {
        case 'requires_action':
        case 'requires_source_action':
            return {
                requiresAction: true,
                paymentIntentId: intent.id,
                clientSecret: intent.client_secret
            };
        case 'requires_payment_method':
        case 'requires_source':
            return {
                error: 'Your card was denied, please provide a new payment method'
            };
        case 'succeeded':
            return {
                clientSecret: intent.client_secret
            };
    }
};

app.post('/pay', async(req, res) => {
    const { 
            paymentMethodId,
            paymentIntentId,
            items,
            currency,
            isSavingCard
        } = req.body;

    const orderAmount = 1400;

    try {
        let intent;
        if(!paymentIntentId) {
            let paymentIntentData = {
                amount: orderAmount,
                currency,
                payment_method: paymentMethodId,
                confirmation_method: "manual",
                confirm: true
            };
            
            if(isSavingCard) {
                const customer = await stripe.customers.create();
                paymentIntentData.customer = customer.id;
                paymentIntentData.setup_future_usage = 'off_session';
            }
            intent = await stripe.paymentIntents.create(paymentIntentData);
            return;
        }
        const response = generateResponse(intent);
        res.send(response);
    } catch(e) {
        console.log(e.message());
    }
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));