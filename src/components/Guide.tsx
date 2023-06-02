import React from "react";
import {Box, Heading, Link, loadCSSFromString, Text} from "@airtable/blocks/ui";
loadCSSFromString(`
#myTable {
  border: 1px solid black;
  border-collapse: collapse;
  border-spacing: 0;
}

#myTable th, #myTable td {
  border: 1px solid black;
  padding: 10px;
}
`);

export const Guide = () =>
    <Box padding={4}><Heading>Guide to Using Ask Airy</Heading>
        <Box padding={3} fontSize='small'>
            <Text>
                Ask Airy can be a powerful tool, but it also has limitations. With improvements in AI technology as
                well as your feedback and support, Ask Airy will improve over time.
                Please send feedback to <Link
                href='mailto:support@zoftware-solutions.com'>support@zoftware-solutions.com</Link>.
            </Text>
            <br/>
            <Heading size='small'>Tips:</Heading>
            <Box>
                <ul>
                    <li>Ask Airy is great for searching and analyzing records in text-heavy tables</li>
                    <li>Use views to filter which records Airy indexes, searches, and analyzes to answer your
                        queries.
                    </li>
                    <li>Add a <Link href='https://support.airtable.com/docs/adding-descriptions-in-airtable'
                                    target='_blank'>description</Link> to your table to give Airy more context about
                        your data.
                    </li>
                    <li>
                        If Airy's responses are not satisfactory, experiment with tweaking your queries.
                        Give Airy more context about what you would like it to answer.
                    </li>
                </ul>
            </Box>
            <Heading size='small'>Examples Tables and Queries:</Heading>
            <br/>
            <Box>
                <table id='myTable'>
                    <tbody>
                    <tr>
                        <th><u>Table Name</u></th>
                        <th><u>Query</u></th>
                    </tr>
                    <tr>
                        <td>Product Reviews</td>
                        <td>Find and summarize negative reviews. Create a list of action items for improving the
                            product design to address the feedback.
                        </td>
                    </tr>
                    <tr>
                        <td>Blog Posts</td>
                        <td>Find the blog where I explain how to implement a CRM solution on Airtable. Create a
                            distilled version of the blog post.
                        </td>
                    </tr>
                    <tr>
                        <td>Book Library</td>
                        <td>Find some books in this library that would be appropriate for my 8 year old who's
                            interested in math and science. Explain why the books would be appropriate.
                        </td>
                    </tr>
                    <tr>
                        <td>(No Table)</td>
                        <td>Write me an Airtable script that finds and deletes all records with the words 'delete
                            me'.
                        </td>
                    </tr>
                    </tbody>
                </table>


            </Box>
            <br/>
            <Heading size='small'>Limitations:</Heading>
            <Box>
                <ul>
                    <li>Airy is not a chatbot and will not remember previous questions.</li>
                    <li>Airy cannot create, edit, or delete new records (except for data in the Data Index field).
                    </li>
                    <li>Airy can only analyze a limited number of records at once. The number of records depends on
                        the amount of data in the records.
                    </li>
                    <li>Airy may be able to analyze numerical data in limited sets of records with limited accuracy,
                        but is incapable of conducting numerical data analysis across an entire table.
                    </li>
                    <li>Using large tables with Ask Airy may be slow, especially on slow internet connections.</li>
                    <li>Ask Airy relies on OpenAI APIs under the hood, which can sometimes be flaky.</li>
                    <li>If asked to write airtable scripts or formulas, Airy may produce incorrect syntax.</li>
                </ul>
            </Box>
            <br/>
        </Box>
    </Box>