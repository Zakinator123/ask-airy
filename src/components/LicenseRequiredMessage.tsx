import React from 'react';
import {Box, Button, Link, Text} from "@airtable/blocks/ui";
import {LicenseStatus} from "../types/OtherTypes";

export const LicenseRequiredMessage = ({licenseStatus}: { licenseStatus: LicenseStatus }) => {
    let infoMessage;
    let licenseButtonMessage = undefined;
    switch (licenseStatus) {
        case 'license-active':
            infoMessage = "✅  License registered successfully!";
            break;
        case "invalid":
            infoMessage = "❌  Your license is not valid.";
            licenseButtonMessage = 'Start Free Trial';
            break;
        case 'expired':
            infoMessage = "❌  Your license subscription is no longer active." +
                " Either restart your existing subscription on Gumroad or purchase and verify a new subscription license to continue using the extension.";
            licenseButtonMessage = "Restart Subscription";
            break;
        case 'unable-to-verify':
            infoMessage = "❌  Unable to verify license. Check your network connection and reload the extension.";
            licenseButtonMessage = 'Start Free Trial';
            break;
        case 'no-license':
            infoMessage = 'A license is required to use Ask Airy.';
            licenseButtonMessage = 'Start Free Trial';
    }

    return <Box display='flex'
                justifyContent='center'
                alignContent='center'
                alignItems='center'
                flexWrap='wrap'>
        <Text size='large' maxWidth='450px'>{infoMessage}</Text>
        {licenseButtonMessage && <Link
            size='large'
            style={{display: 'inline'}}
            href='https://www.zoftware-solutions.com/l/ask-airy'
            target='_blank'
        >&nbsp;<Button margin={3}
                       style={{padding: '0.5rem'}}
                       variant='primary'
                       size='small'>
            {licenseButtonMessage}
        </Button>
        </Link>}
    </Box>;
}
