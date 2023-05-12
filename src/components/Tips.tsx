import React from "react";
import {Button, Dialog, Heading, Text} from "@airtable/blocks/ui";

export const Tips = ({tipsDialogOpen, setTipsDialogOpen}: {
    tipsDialogOpen: boolean,
    setTipsDialogOpen: (tipsDialogOpen: boolean) => void
}) => {
    return tipsDialogOpen ?
        <Dialog onClose={() => setTipsDialogOpen(false)} width="320px">
            <Dialog.CloseButton/>
            <Heading>Tips for Using Ask Airy</Heading>
            <Text variant="paragraph">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam neque
                dui, euismod ac quam eget, pretium cursus nisl.
            </Text>
            <Button onClick={() => setTipsDialogOpen(false)}>Close</Button>
        </Dialog> : <></>
}