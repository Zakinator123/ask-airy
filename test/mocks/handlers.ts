import {rest} from 'msw'

const gumroadUrl = 'https://api.gumroad.com/v2/licenses/verify';

const successfulLicenseVerificationResponse = {
    "success": true,
    "uses": 0,
    "purchase": {
        "seller_id": "kL0psVL2admJSYRNs-OCMg==",
        "product_id": "Y2ZB-bVqRccW_MVqLs4cUg==",
        "product_name": "licenses demo product",
        "permalink": "QMGY",
        "product_permalink": "https://sahil.gumroad.com/l/pencil",
        "email": "customer@example.com",
        "price": 0,
        "gumroad_fee": 0,
        "currency": "usd",
        "quantity": 1,
        "discover_fee_charged": false,
        "can_contact": true,
        "referrer": "direct",
        "card": {
            "expiry_month": null,
            "expiry_year": null,
            "type": null,
            "visual": null
        },
        "order_number": 524459935,
        "sale_id": "FO8TXN-dbxYaBdahG97Y-Q==",
        "sale_timestamp": "2021-01-05T19:38:56Z",
        "purchaser_id": "5550321502811",
        "subscription_id": "GDzW4_aBdQc-o7Gbjng7lw==",
        "variants": "",
        "license_key": "85DB562A-C11D4B06-A2335A6B-8C079166",
        "is_multiseat_license": false,
        "ip_country": "United States",
        "recurrence": "monthly",
        "is_gift_receiver_purchase": false,
        "refunded": false,
        "disputed": false,
        "dispute_won": false,
        "id": "FO8TXN-dvaYbBbahG97a-Q==",
        "created_at": "2021-01-05T19:38:56Z",
        "custom_fields": [],
        "chargebacked": false,
        "subscription_ended_at": null as null | string,
        "subscription_cancelled_at": null,
        "subscription_failed_at": null
    }
}

export const handlers = [
    rest.post(gumroadUrl, (req, res, ctx) =>
        res(ctx.json(successfulLicenseVerificationResponse))),
];

// Handlers used at runtime:
export const licenseNotFound = rest.post(gumroadUrl, (req, res, ctx) =>
    res(ctx.status(404)));

export const licenseVerificationError = rest.post(gumroadUrl, (req, res, ctx) =>
    res(ctx.status(500)));

export const licenseVerificationNetworkError = rest.post(gumroadUrl, (req, res) =>
    res.networkError('Failed to connect'));

export const expiredLicenseVerification = rest.post(gumroadUrl, (req, res, ctx) => {
    const successfulResponseWithExpiredSubscription = JSON.parse(JSON.stringify(successfulLicenseVerificationResponse))
    successfulResponseWithExpiredSubscription.purchase.subscription_ended_at = '2021-01-05T19:38:56Z';

    return res(ctx.json(successfulResponseWithExpiredSubscription));
})

export const alreadyRedeemedLicense = rest.post(gumroadUrl, (req, res, ctx) => {
    const successfulResponseWithMoreThanOneUse = {...successfulLicenseVerificationResponse};
    successfulResponseWithMoreThanOneUse.uses = 2;

    return res(ctx.json(successfulResponseWithMoreThanOneUse));
});

export const licenseVerificationWithFailureInValidResponse = rest.post(gumroadUrl, (req, res, ctx) => {
    const responseWithSuccessEqualToFalseInBody = {...successfulLicenseVerificationResponse};
    responseWithSuccessEqualToFalseInBody.success = false;

    return res(ctx.json(responseWithSuccessEqualToFalseInBody));
});

export const licenseVerificationWithMalformedResponse = rest.post(gumroadUrl, (req, res, ctx) => {
    const responseWithMalformedBody = {...successfulLicenseVerificationResponse};
    // @ts-ignore
    responseWithMalformedBody.purchase = undefined;

    return res(ctx.json(responseWithMalformedBody));
});
