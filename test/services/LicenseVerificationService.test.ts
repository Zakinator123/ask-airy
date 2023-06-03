import {describe, expect, it} from '@jest/globals';
import {GumroadLicenseVerificationService} from "../../src/services/LicenseVerificationService";
import {server} from "../mocks/mock-server";
import {
    expiredLicenseVerification,
    licenseNotFound,
    licenseVerificationError,
    licenseVerificationNetworkError,
    alreadyRedeemedLicense,
    licenseVerificationWithFailureInValidResponse,
    licenseVerificationWithMalformedResponse
} from "../mocks/handlers";

describe('GumroadLicenseVerificationService', () => {
    const gumroadLicenseVerificationService = new GumroadLicenseVerificationService();

    it('should return unable-to-verify status when fetch returns unexpected status code.', async () => {
        server.use(licenseVerificationError);
        const result = await gumroadLicenseVerificationService.verifyLicense('test-license', true);
        expect(result).toEqual({
            licenseStatus: 'unable-to-verify',
            message: 'Unable to verify license. The license verification service is not responding as expected. Please try again later or contact the developer for support.'
        });
    });

    it('should return unable-to-verify status when fetch has network error.', async () => {
        server.use(licenseVerificationNetworkError);

        const result = await gumroadLicenseVerificationService.verifyLicense('test-license', true);
        expect(result).toEqual({
            licenseStatus: 'unable-to-verify',
            message: 'Unable to verify license. Please check your internet connection and reload the extension.'
        });
    });

    it('should return invalid status when license not found.', async () => {
        server.use(licenseNotFound);

        const result = await gumroadLicenseVerificationService.verifyLicense('test-license', true);
        expect(result).toEqual({
            licenseStatus: 'invalid',
            message: 'Invalid license. Please check your license key and try again.'
        });
    });

    it('should return expired status when license subscription has expired.', async () => {
        server.use(expiredLicenseVerification);

        const result = await gumroadLicenseVerificationService.verifyLicense('test-license', true);
        expect(result).toEqual({
            licenseStatus: 'expired',
            message: 'Your license subscription is no longer active. Restart your existing subscription or purchase and verify a new subscription license to continue using Ask Airy.'
        });
    });

    it('should return invalid status when license has already been redeemed.', async () => {
        server.use(alreadyRedeemedLicense);

        const result = await gumroadLicenseVerificationService.verifyLicense('test-license', true);
        expect(result).toEqual({
            licenseStatus: 'invalid',
            message: 'Your license has already been redeemed. Licenses can only be redeemed once.'
        });
    });

    it('should return unable-to-verify status when response not successful.', async () => {
        server.use(licenseVerificationWithFailureInValidResponse);

        const result = await gumroadLicenseVerificationService.verifyLicense('test-license', true);
        expect(result).toEqual({
            licenseStatus: 'invalid',
            message: 'Invalid license. Please check your license key and try again.'
        });
    });


    it('should return unable-to-verify status when response malformed.', async () => {
        server.use(licenseVerificationWithMalformedResponse);

        const result = await gumroadLicenseVerificationService.verifyLicense('test-license', true);
        expect(result).toEqual({
            licenseStatus: 'unable-to-verify',
            message: 'Unable to verify license. An issue occurred while parsing the license verification response. Please try again later or contact the developer for support.'
        });
    });

    it('should return premium status when verification response successful.', async () => {
        const result = await gumroadLicenseVerificationService.verifyLicense('test-license', true);
        expect(result).toEqual({
            licenseStatus: 'license-active',
            message: 'License verified! You can now use Ask Airy! 🎉🎉'
        });
    });
});