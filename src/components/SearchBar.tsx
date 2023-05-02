import React, {useState} from "react";
import {Button, Input, useRecords} from "@airtable/blocks/ui";
import {SearchService, SearchTable} from "../types/CoreTypes";
import {Record} from "@airtable/blocks/models";
import {AIProviderName, SearchTableConfigWithDefinedSearchIndexField} from "../types/ConfigurationTypes";


export const SearchBar = ({
                              semanticSearchService,
                              searchTableConfig,
                              setSearchResults,
                          }: {
    semanticSearchService: SearchService,
    searchTableConfig: SearchTableConfigWithDefinedSearchIndexField,
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
        await semanticSearchService.updateSearchIndexForTable(searchTable);
        const results = await semanticSearchService.executeSemanticSearchForTable(searchTable, searchQuery, 5);
        console.log(results);
        setSearchResults(results);
    }

    return <>
        <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search Query"
        />
        <Button variant='primary' onClick={executeSearch}>Search</Button>
    </>
}