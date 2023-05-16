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
                Ask Airy is an Airtable extension that enables you to intuitively
                search and query your data with natural language using
                the power of AI.
                <br/><br/>
                Head over to the settings tab to get started!
            </Text>
        </Box>
        <br/>

        <Text as='h3' fontWeight={600} size='xlarge'>How this extension works:</Text>
        <Box padding='0.7rem'>
            <Text>
                When you use a table with Ask Airy, a 'Data Index' field will be created.
                When you ask your first query, Ask Airy will populate this field with AI-generated data
                (embeddings) that will be used to find the most relevant records for your queries.
                <br/><br/>
                Once the Data Index is built and the most relevant records are found for your query,
                Airy will try to analyze as many of those records as it can to formulate an answer to your query.
                <br/><br/>
                Any record updates will cause the Data Index field for that record to be updated the next time you use Ask
                Airy.
                <br/>
            </Text>
        </Box>
        <br/>
        <Text as='h3' fontWeight={600} size='xlarge'>Support:</Text>
        <Box padding='0.7rem'>
            Any feedback, feature requests, bug reports, or questions can be sent
            to the developer at&nbsp;
            <Link href='mailto:support@zoftware-solutions.com'>support@zoftware-solutions.com</Link>
            <br/>
            <br/>
            <Text>
                If you would like to support the development of this extension, please consider <Link
                href='https://www.buymeacoffee.com/zakey' target='_blank'>buying me a coffee.</Link>
            </Text>
        </Box>
        <br/>
        <Text fontWeight={600} size='xlarge'>Source Code:</Text>
        <Text padding='0.7rem'>
            This extension is open source and can be viewed on <Link href='https://github.com/Zakinator123/ask-airy'
                                                                     target='_blank'>Github</Link>.
            <br/>
            Version 1.0.0
        </Text>
    </Box>
}