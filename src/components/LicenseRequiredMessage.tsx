import React from 'react';
import {Box, Button, Link, Text} from "@airtable/blocks/ui";

export const LicenseRequiredMessage = () => <Box display='flex' justifyContent='center' alignContent='center'
                                                 alignItems='center' flexWrap='wrap'>
    <Text size='large'>A license is required to use Ask Airy.</Text>
    <Link
        size='large'
        style={{display: 'inline'}}
        href='https://www.zoftware-solutions.com/l/ask-airy'
        target='_blank'
    >&nbsp;<Button margin={3}
                   style={{padding: '0.5rem'}}
                   variant='primary'
                   size='small'>
        Start Free Trial
    </Button>
    </Link>
</Box>
