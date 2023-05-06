import React, {useState} from "react";
import {Button, Input, useRecords} from "@airtable/blocks/ui";
import {SearchService, SearchTable} from "../types/CoreTypes";
import {Record} from "@airtable/blocks/models";
import {SearchTableConfigWithDefinedSearchIndexField} from "../types/ConfigurationTypes";


export const SearchBar = ({
                              searchIsPending,
                              setSearchIsPending,
                              semanticSearchService,
                              searchTableConfig,
                              setSearchAnswer,
                              setSearchResults,
                          }: {
    searchIsPending: boolean,
    setSearchIsPending: (pending: boolean) => void,
    semanticSearchService: SearchService,
    searchTableConfig: SearchTableConfigWithDefinedSearchIndexField,
    setSearchAnswer: (answer: string) => void,
    setSearchResults: (results: Record[]) => void,
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const recordsToSearch = useRecords(searchTableConfig.table);

    const searchTable: SearchTable = {
        table: searchTableConfig.table,
        recordsToSearch,
        searchFields: searchTableConfig.searchFields,
        intelliSearchIndexField: searchTableConfig.intelliSearchIndexField,
    }

    const executeSearch = async () => {
        setSearchIsPending(true);
        await semanticSearchService.updateSearchIndexForTable(searchTable);
        const results = await semanticSearchService.executeSemanticSearchForTable(searchTable, searchQuery, 5);
        console.log(results.relevantRecords);
        setSearchResults(results.relevantRecords);
        setSearchAnswer(results.aiAnswer);
        setSearchIsPending(false);
    }

    return <>
        <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Ask the AI anything about your table..."
        />
        <Button variant='primary' onClick={executeSearch}>Ask the AI</Button>
        {searchIsPending && <p>Searching...</p>}
    </>
}