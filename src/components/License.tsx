import React, {useEffect, useState} from "react";
import {Box, Button, FormField, Icon, Input, Link, loadCSSFromString, Loader, Text} from "@airtable/blocks/ui";
import {GlobalConfig} from "@airtable/blocks/types";
import {asyncAirtableOperationWrapper} from "../utils/RandomUtils";
import {toast} from "react-toastify";
import {OfflineToastMessage} from "./OfflineToastMessage";
import {Toast} from "./Toast";
import {GumroadLicenseVerificationService} from "../services/LicenseVerificationService";
import {LicenseStatus} from "../types/OtherTypes";

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

export const License = ({
                            licenseVerificationService,
                            licenseStatus,
                            setLicenseStatus,
                            licenseUpdatePending,
                            setLicenseUpdatePending,
                            globalConfig,
                            currentLicense
                        }: {
    licenseVerificationService: GumroadLicenseVerificationService
    licenseStatus: LicenseStatus,
    setLicenseStatus: (status: LicenseStatus) => void,
    licenseUpdatePending: boolean,
    setLicenseUpdatePending: (pending: boolean) => void,
    globalConfig: GlobalConfig,
    currentLicense: string | undefined,
}) => {
    const [licenseKey, setLicenseKey] = useState(currentLicense ?? '');
    useEffect(() => () => toast.dismiss(), []);

    const licenseToastContainerId = 'license-toast-container'

    const verifyLicense = () => {
        setLicenseUpdatePending(true);

        if (globalConfig.hasPermissionToSet('license', true)) {
            licenseVerificationService.verifyLicense(licenseKey, true)
                .then(result => {
                    if (result.premiumStatus === 'premium') {
                        asyncAirtableOperationWrapper(() => globalConfig.setAsync('license', licenseKey),
                            () => toast.loading(<OfflineToastMessage/>, {
                                autoClose: false,
                                containerId: licenseToastContainerId
                            }))
                            .then(() => {
                                setLicenseStatus('premium');
                                return toast.success(result.message, {
                                    autoClose: 5000,
                                    containerId: licenseToastContainerId
                                });
                            })
                            .catch(() => {
                                licenseVerificationService.decrementGumroadLicenseUsesCount(licenseKey);
                                toast.error('Your license is valid, but there was an error saving it! Contact the developer for support.', {
                                    autoClose: 8000,
                                    containerId: licenseToastContainerId
                                });
                            })
                    } else toast.error(result.message, {containerId: licenseToastContainerId});
                })
                .finally(() => setLicenseUpdatePending(false))
        } else {
            toast.error("You must have base editor permissions to save a license.", {
                autoClose: 5000,
                containerId: licenseToastContainerId
            });
            setLicenseUpdatePending(false);
        }
    }

    const removeLicense = () => {
        setLicenseUpdatePending(true);
        if (globalConfig.hasPermissionToSet('license', true)) {
            asyncAirtableOperationWrapper(() => globalConfig.setAsync('license', undefined),
                () => toast.loading(<OfflineToastMessage/>, {
                    autoClose: false,
                    containerId: licenseToastContainerId
                }))
                .then(() => {
                    setLicenseStatus('free');
                    setLicenseKey('');
                    return toast.success('Successfully removed license.', {
                        autoClose: 5000,
                        containerId: licenseToastContainerId
                    });
                })
                .catch(() => {
                    toast.error('There was an error removing your license. Please try again.', {
                        autoClose: 8000,
                        containerId: licenseToastContainerId
                    });
                })
                .finally(() => setLicenseUpdatePending(false))
        } else {
            toast.error("You must have base editor permissions to remove a license.", {
                autoClose: 5000,
                containerId: licenseToastContainerId
            });
            setLicenseUpdatePending(false);
        }
    }

    let infoMessage;
    switch (licenseStatus) {
        case 'premium':
            infoMessage = "✅  License registered successfully!";
            break;
        case "invalid":
            infoMessage = "❌  Your license is no longer valid.";
            break;
        case 'expired':
            infoMessage = "❌  Your license subscription is no longer active." +
                " Either restart your existing subscription on Gumroad or purchase and verify a new subscription license to continue using the extension.";
            break;
        case 'unable-to-verify':
            infoMessage = "❌  Unable to verify license. Check your network connection and reload the extension.";
            break;
        case 'free':
            infoMessage = 'A license is required to use Ask Airy.';
    }

    return <>
        <Box className='centered-premium-container'>
            <Text size='large' maxWidth='450px' marginBottom='1rem'>
                {
                    licenseStatus === 'free'
                        ? <>{infoMessage}
                            <Link target="_blank" size='large' style={{display: "inline"}}
                                  href='https://www.zoftware-solutions.com/l/ask-airy'>
                                &nbsp;All licenses come with a 1 week free trial!
                            </Link>
                        </>
                        : {infoMessage}
                }
            </Text>
            <Box className='premium-form'>
                <FormField
                    className='premium-form-field'
                    marginBottom={0}
                    label={
                        <><Icon name="premium" size={12}/> License Key <Icon name="premium" size={12}/></>
                    }>
                    <Box className='premium-input-box'>
                        <Input value={licenseKey}
                               disabled={licenseStatus !== 'free' || licenseUpdatePending}
                               placeholder='Enter license key here..'
                               onChange={e => setLicenseKey(e.target.value)} type='text'></Input>
                        {
                            licenseStatus !== 'free'
                                ? <Button variant='default'
                                          className='premium-submit-button'
                                          type='submit'
                                          disabled={licenseUpdatePending}
                                          onClick={removeLicense}>
                                    {licenseUpdatePending ? <Loader
                                        scale={0.2}/> : 'Remove License'}
                                </Button>
                                : <Button variant='default'
                                          className='premium-submit-button'
                                          type='submit'
                                          disabled={licenseUpdatePending}
                                          onClick={verifyLicense}>
                                    {licenseUpdatePending ? <Loader
                                        scale={0.3}/> : 'Verify License'}
                                </Button>
                        }
                    </Box>
                    <Box margin={2}><Text size='small' textColor='gray'>Licenses are not transferable between
                        bases and can only be redeemed once.</Text></Box>
                </FormField>
                <Toast containerId={licenseToastContainerId}/>
                <Box marginTop={3} display='flex' alignContent='center' justifyContent='center'>
                    <Link
                        href="https://www.zoftware-solutions.com/l/ask-airy"
                        target="_blank">
                        <Button variant='primary'>
                            {/*TODO: Show different message here if user already has a license? */}
                            Start your Free Trial!
                        </Button>
                    </Link>
                </Box>
            </Box>
        </Box>
    </>
}