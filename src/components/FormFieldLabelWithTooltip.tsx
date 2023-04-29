import React from "react";
import {Icon, Tooltip, Text} from "@airtable/blocks/ui";

export const FormFieldLabelWithTooltip = ({
                                              fieldLabel,
                                              fieldLabelTooltip,
                                              dangerous = false
                                          }: { fieldLabel: string, fieldLabelTooltip: string, dangerous?: boolean }) =>
    <>
        <Text display='inline-block' textColor='gray'>{fieldLabel}</Text>
        <Tooltip
            fitInWindowMode={Tooltip.fitInWindowModes.NUDGE}
            content={() => <Text margin='0 0.5rem 0 0.5rem' textColor='white' size='small' display='inline'>{fieldLabelTooltip}</Text>}
            placementX={Tooltip.placements.CENTER}
            placementY={Tooltip.placements.TOP}>
            <Icon position='relative' top='1px' fillColor={dangerous ? 'red' : 'dark-gray'} name="info" size={12} marginLeft='0.25rem'/>
        </Tooltip>
    </>