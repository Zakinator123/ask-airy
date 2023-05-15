import React from "react";
import {Box, Button, Dialog, Heading, Text} from "@airtable/blocks/ui";

export const Tips = ({tipsDialogOpen, setTipsDialogOpen}: {
    tipsDialogOpen: boolean,
    setTipsDialogOpen: (tipsDialogOpen: boolean) => void
}) => {

    /*
            - include message saying that large tables may take a while to load and index with slow internet connections.
            - guide should mention that using views will also decrease index building time.
            - guide should mention that Airy is not a chatbot and will not remember prev questions.
            - Add a description to your table to give Airy more context
            - Its particularly suited for NLP tasks and semantic search, but not numerical data analysis over the entire airtable
     */
    return tipsDialogOpen ?
        <Dialog padding={4} onClose={() => setTipsDialogOpen(false)} width="550px">
            <Dialog.CloseButton/>
            <Heading>Guide to Using Ask Airy</Heading>
            <Box padding={3}>
                <Text marginLeft={3}>
                    While Ask Airy can be a powerful tool, it also has limitations.
                </Text>
                <br/><br/>
                <Heading size='small'>Ideal Use Cases:</Heading>
                <Box>
                    <ul>
                        <li>
                            Searching for records in tables with text data
                            <Box fontSize='small' paddingLeft={3}>
                                Examples:
                                <ul>
                                    <li>Product Reviews : "Find reviews with positive feedback"</li>
                                    <li>Blog Posts: "Find me that blog where I explain how to implement a CRM solution
                                        on
                                        Airtable"
                                    </li>
                                    <li>Furniture Inventory: "What is the item ID of the brown leather couch located in
                                        warehouse
                                        #2?"
                                    </li>
                                </ul>
                            </Box>
                        </li>
                        <br/>
                        <li>
                            Asking questions about limited sets of records.
                            <ol>
                                <li></li>
                            </ol>
                        </li>
                    </ul>
                </Box>
                <Heading size='small'>Limitations of Ask Airy:</Heading>
                <Box>
                    <ul >
                        <li>Airy can only analyze a limited number of records at once, depending on the size of the records.</li>
                        <li>Airy's intelligent search capabilities are best suited for text data, rather than numerical data.</li>
                        <li>Airy is not a chatbot and will not remember previous questions.</li>
                        <li>Using large tables with Ask Airy may be slow, especially on slow internet connections.</li>
                    </ul>
                </Box>
                <Button onClick={() => setTipsDialogOpen(false)}>Close</Button>
            </Box>
        </Dialog> : <></>
}