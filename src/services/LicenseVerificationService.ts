import {LicenseStatus} from "../types/OtherTypes";
import 'whatwg-fetch';

export class GumroadLicenseVerificationService {
    private readonly gumroadApiUrl = 'https://api.gumroad.com/v2/licenses/';
    private readonly productId = 'Y2ZB-bVqRccW_MVqLs4cUg==';

    private verifyGumroadLicense = (license: string, incrementUsesCount: boolean) => {
        return fetch(this.gumroadApiUrl + 'verify', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                product_id: this.productId,
                license_key: license,
                increment_uses_count: `${incrementUsesCount}`,
            })
        });
    }

    decrementGumroadLicenseUsesCount = (license: string) => {
        fetch(this.gumroadApiUrl + 'decrement_uses_count', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                product_id: this.productId,
                license_key: license,
            })
        });
    }

    verifyLicense = async (license: string, incrementUsesCount: boolean): Promise<{ licenseStatus: LicenseStatus, message: string }> => {
        let verificationResponse: Response;
        try {
            verificationResponse = await this.verifyGumroadLicense(license, incrementUsesCount);
        } catch (e) {
            return {
                licenseStatus: "unable-to-verify",
                message: 'Unable to verify license. Please check your internet connection and reload the extension.'
            };
        }

        if (verificationResponse.status === 404) {
            return {licenseStatus: "invalid", message: 'Invalid license. Please check your license key and try again.'};
        }

        if (verificationResponse.status !== 200) {
            return {licenseStatus: "unable-to-verify", message: 'Unable to verify license. The license verification service is not responding as expected. Please try again later or contact the developer for support.'};
        }

        try {
            const responseJson = await verificationResponse.json();

            if (responseJson.success === false) {
                return {
                    licenseStatus: "invalid",
                    message: 'Invalid license. Please check your license key and try again.'
                };
            }

            if (responseJson.uses >= 2) {
                return {
                    licenseStatus: 'invalid',
                    message: 'Your license has already been redeemed. Licenses can only be redeemed once.'
                };
            }

            const [subscriptionEndedAt, subscriptionCancelledAt, subscriptionFailedAt] = [responseJson.purchase.subscription_ended_at, responseJson.purchase.subscription_cancelled_at, responseJson.purchase.subscription_failed_at]
            if (subscriptionEndedAt !== null || subscriptionCancelledAt !== null || subscriptionFailedAt !== null) {
                return {
                    licenseStatus: 'expired',
                    message: 'Your license subscription is no longer active. Restart your existing subscription or purchase and verify a new subscription license to continue using Ask Airy.'
                };

            }

        } catch (e) {
            return {licenseStatus: "unable-to-verify", message: 'Unable to verify license. An issue occurred while parsing the license verification response. Please try again later or contact the developer for support.'};
        }

        return {licenseStatus: "license-active", message: 'License verified! You can now use Ask Airy! 🎉🎉'};
    }
}