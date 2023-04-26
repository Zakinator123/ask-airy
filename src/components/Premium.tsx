import React, {useEffect, useState} from "react";
import {Box, Button, FormField, Icon, Input, Link, loadCSSFromString, Loader, Text} from "@airtable/blocks/ui";
import {GlobalConfig} from "@airtable/blocks/types";
import {asyncAirtableOperationWrapper} from "../utils/RandomUtils";
import {toast} from "react-toastify";
import {OfflineToastMessage} from "./OfflineToastMessage";
import {Toast} from "./Toast";
import {GumroadLicenseVerificationService} from "../services/LicenseVerificationService";
import {PremiumStatus} from "../types/OtherTypes";

loadCSSFromString(`
.centered-premium-container {
    display: flex;
    flex-direction: column;
    padding: 2rem;
    gap: 1rem;
}

.premium-input-box {
    display: flex;
    flex-direction: column;
}

.premium-submit-button {
    margin: 1rem 0 0 0;
}

.premium-form-field {
    margin: 0 0 1rem 0;
}

.premium-form {
    display: flex;
    flex-direction: column;
    margin-bottom: 0;
    width: 70vw;
    max-width: 450px;
}

@media (min-width: 515px) {
    .premium-input-box {
        flex-direction: row;
    }
    
    .premium-form-field {
    margin: 0;
}
    
    .premium-submit-button {
        margin: 0 0 0 1rem;
    }
}
`);

export const Premium = ({
                            licenseVerificationService,
                            premiumStatus,
                            setPremiumStatus,
                            premiumUpdatePending,
                            setPremiumUpdatePending,
                            globalConfig,
                            currentPremiumLicense
                        }: {
    licenseVerificationService: GumroadLicenseVerificationService
    premiumStatus: PremiumStatus,
    setPremiumStatus: (status: PremiumStatus) => void,
    premiumUpdatePending: boolean,
    setPremiumUpdatePending: (pending: boolean) => void,
    globalConfig: GlobalConfig,
    currentPremiumLicense: string | undefined,
}) => {
    const [licenseKey, setLicenseKey] = useState(currentPremiumLicense ?? '');
    useEffect(() => () => toast.dismiss(), []);

    const premiumToastContainerId = 'premium-toast-container'

    const verifyLicense = () => {
        setPremiumUpdatePending(true);

        if (globalConfig.hasPermissionToSet('premiumLicense', true)) {
            licenseVerificationService.verifyLicense(licenseKey, true)
                .then(result => {
                    if (result.premiumStatus === 'premium') {
                        asyncAirtableOperationWrapper(() => globalConfig.setAsync('premiumLicense', licenseKey),
                            () => toast.loading(<OfflineToastMessage/>, {
                                autoClose: false,
                                containerId: premiumToastContainerId
                            }))
                            .then(() => {
                                setPremiumStatus('premium');
                                return toast.success(result.message, {
                                    autoClose: 5000,
                                    containerId: premiumToastContainerId
                                });
                            })
                            .catch(() => {
                                licenseVerificationService.decrementGumroadLicenseUsesCount(licenseKey);
                                toast.error('Your license is valid, but there was an error saving it! Contact the developer for support.', {
                                    autoClose: 8000,
                                    containerId: premiumToastContainerId
                                });
                            })
                    } else toast.error(result.message, {containerId: premiumToastContainerId});
                })
                .finally(() => setPremiumUpdatePending(false))
        } else {
            toast.error("You must have base editor permissions to upgrade this extension to premium.", {
                autoClose: 5000,
                containerId: premiumToastContainerId
            });
            setPremiumUpdatePending(false);
        }
    }

    const removeLicense = () => {
        setPremiumUpdatePending(true);
        if (globalConfig.hasPermissionToSet('premiumLicense', true)) {
            asyncAirtableOperationWrapper(() => globalConfig.setAsync('premiumLicense', undefined),
                () => toast.loading(<OfflineToastMessage/>, {
                    autoClose: false,
                    containerId: premiumToastContainerId
                }))
                .then(() => {
                    setPremiumStatus('free');
                    setLicenseKey('');
                    return toast.success('Successfully removed premium license.', {
                        autoClose: 5000,
                        containerId: premiumToastContainerId
                    });
                })
                .catch(() => {
                    toast.error('There was an error removing your premium license. Please try again.', {
                        autoClose: 8000,
                        containerId: premiumToastContainerId
                    });
                })
                .finally(() => setPremiumUpdatePending(false))
        } else {
            toast.error("You must have base editor permissions to remove a premium license.", {
                autoClose: 5000,
                containerId: premiumToastContainerId
            });
            setPremiumUpdatePending(false);
        }
    }

    let infoMessage;
    switch (premiumStatus) {
        case 'premium':
            infoMessage = "✅  You are a premium user!";
            break;
        case "invalid":
            infoMessage = "❌  Your premium license is no longer valid.";
            break;
        case 'expired':
            infoMessage = "❌  Your premium subscription is no longer active." +
                " Either restart your existing subscription on Gumroad or purchase and verify a new subscription license to continue using premium features.";
            break;
        case 'unable-to-verify':
            infoMessage = "❌  Unable to verify license. Check your network connection and reload the extension.";
            break;
        case 'free':
            infoMessage = 'Upgrade to premium to enable cart sizes larger than 3 items!';
    }

    return <>
        <Box className='centered-premium-container'>
            <Text size='large' maxWidth='450px' marginBottom='1rem'>
                {infoMessage}
            </Text>
            <Box className='premium-form'>
                <FormField
                    className='premium-form-field'
                    marginBottom={0}
                    label={
                        <><Icon name="premium" size={12}/> Premium License Key <Icon name="premium" size={12}/></>
                    }>
                    <Box className='premium-input-box'>
                        <Input value={licenseKey}
                               disabled={premiumStatus !== 'free' || premiumUpdatePending}
                               placeholder='Enter license key here..'
                               onChange={e => setLicenseKey(e.target.value)} type='text'></Input>
                        {
                            premiumStatus !== 'free'
                                ? <Button variant='default'
                                          className='premium-submit-button'
                                          type='submit'
                                          disabled={premiumUpdatePending}
                                          onClick={removeLicense}>
                                    {premiumUpdatePending ? <Loader
                                        scale={0.2}/> : 'Remove License'}
                                </Button>
                                : <Button variant='default'
                                          className='premium-submit-button'
                                          type='submit'
                                          disabled={premiumUpdatePending}
                                          onClick={verifyLicense}>
                                    {premiumUpdatePending ? <Loader
                                        scale={0.3}/> : 'Verify License'}
                                </Button>
                        }
                    </Box>
                    <Box margin={2}><Text size='small' textColor='gray'>Premium licenses are not transferable between
                        bases and can only be redeemed once.</Text></Box>
                </FormField>
                <Toast containerId={premiumToastContainerId}/>
                <Box marginTop={3} display='flex' alignContent='center' justifyContent='center'>
                    <Link
                        href="https://www.zoftware-solutions.com/l/checkoutcart"
                        target="_blank">
                        <Button variant='primary'>
                            Purchase License
                        </Button>
                    </Link>
                </Box>
            </Box>
        </Box>
    </>
}