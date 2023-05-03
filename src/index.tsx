import React from "react";
import {initializeBlock} from '@airtable/blocks/ui';
import {ExtensionWithSettings} from "./components/ExtensionWithSettings";
import {RequestRateLimiter} from "./utils/RequestRateLimiter";
import {AirtableMutationService} from "./services/AirtableMutationService";
import {GumroadLicenseVerificationService} from "./services/LicenseVerificationService";

initializeBlock(() => {
    const rateLimiter = new RequestRateLimiter(15, 1000);
    const airtableMutationService = new AirtableMutationService(rateLimiter);
    const licenseVerificationService = new GumroadLicenseVerificationService();

    return <ExtensionWithSettings airtableMutationService={airtableMutationService}
                                  licenseVerificationService={licenseVerificationService}/>;
});
