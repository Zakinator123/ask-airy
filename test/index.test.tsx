import React from 'react';
import {beforeEach, describe, expect, it} from '@jest/globals';
import TestDriver from '@airtable/blocks-testing';
import {render, screen} from '@testing-library/react';
import {basicTestFixture} from './basic-test-fixture';
import {ExtensionWithSettings} from "../src/components/ExtensionWithSettings";
import {RequestRateLimiter} from "../src/utils/RequestRateLimiter";
import {AirtableMutationService} from "../src/services/AirtableMutationService";
import {GumroadLicenseVerificationService} from "../src/services/LicenseVerificationService";
import userEvent from '@testing-library/user-event'

describe('ExtensionWithSettings', () => {
    let testDriver;
    const user = userEvent.setup()

    beforeEach(() => {
        testDriver = new TestDriver(basicTestFixture);

        const rateLimiter = new RequestRateLimiter(15, 1000);
        const airtableMutationService = new AirtableMutationService(rateLimiter);
        const licenseVerificationService = new GumroadLicenseVerificationService();

        render(
            <testDriver.Container>
                <ExtensionWithSettings airtableMutationService={airtableMutationService}
                                       licenseVerificationService={licenseVerificationService}/>
            </testDriver.Container>,
        );
    });

    it('should render.', () => {
        screen.getByText('Settings');
    });

    // it('should have tab navigation that works as expected.', async () => {
    //     expect(screen.getByText('How this extension works:')).toBeTruthy();
    //
    //     expect(screen.queryByText('You must configure the extension in the settings tab before you can use it!')).toBeNull();
    //     expect(screen.queryByText('The cart is empty')).toBeNull();
    //     expect(screen.queryByText('Save Configuration')).toBeNull();
    //
    //     await user.click(screen.getByText('Settings'));
    //     expect(await screen.findByText('Save Configuration')).toBeTruthy();
    //
    //     await user.click(screen.getByText('Premium'));
    //     expect(await screen.findByText('Upgrade to premium to enable cart sizes larger than 3 items!')).toBeTruthy();
    //
    //     await user.click(screen.getByText('🛒'));
    //     expect(await screen.findByText('You must configure the extension in the settings tab before you can use it!')).toBeTruthy();
    // });
});