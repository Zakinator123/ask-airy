import React from "react";
import {Box, Link, loadCSSFromString, Text} from "@airtable/blocks/ui";

loadCSSFromString(`
.centered-about-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 1rem;
    max-width: 750px;
    margin-top: 1rem;
}

.explanation-section {
    padding-left: 1rem;
}

@media (min-width: 515px) {
    .centered-about-container {
        padding: 3rem;
        margin-top: 0;
    }
    
    .explanation-section {
        padding-left: 2rem;
    }
}`);

export const About = () => {
    return <Box className='centered-about-container'>
        <Text as='h3' fontWeight={600} size='xlarge'>About:</Text>
        <Box padding='0.7rem'>
            <Text>
                About text here.
            </Text>
        </Box>
        <br/>

        <Text as='h3' fontWeight={600} size='xlarge'>How this extension works:</Text>
        <br/>
        <Text>Explanation Text here.</Text>
        <br/>
        <Text as='h3' fontWeight={600} size='xlarge'>Support:</Text>
        <Box padding='0.7rem'>
            Any feedback, feature requests, bug reports, questions, and consultation/customization inquiries can be sent
            to the developer at&nbsp;
            <Link href='mailto:support@zoftware-solutions.com'>support@zoftware-solutions.com</Link>
            <br/>
            <br/>
            <Text>
                If you would like to support the development of this extension, please consider purchasing a premium
                license.
            </Text>
        </Box>
        <br/>
        <Text fontWeight={600} size='xlarge'>Source Code:</Text>
        <Text padding='0.7rem'>
            This extension is open source and can be viewed on Github.
            <br/>
            Version 1.0.0
        </Text>
    </Box>
}