import React, {useState} from "react";
import {Button, Input, useRecords} from "@airtable/blocks/ui";
import {SearchService, SearchTable} from "../types/CoreTypes";
import {Record, Table} from "@airtable/blocks/models";


export const SearchBar = ({
                              semanticSearchService,
                              tableToSearch,
                              setSearchResults
                          }: {
    semanticSearchService: SearchService,
    tableToSearch: Table,
    setSearchResults: (results: Record[]) => void
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const recordsToSearch = useRecords(tableToSearch);

    const searchTable: SearchTable = {
        table: tableToSearch,
        recordsToSearch,
        searchFields: tableToSearch.fields,
        intelliSearchIndexField: tableToSearch.getField('IntelliSearch Index'),
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