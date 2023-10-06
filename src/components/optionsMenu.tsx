export const component: DraymanComponent<{
    header: string;
    options: any[];
    selectedOption: any;
    viewportHeight: number;
    onSelect: (data: { value: any; }) => Promise<void>;
}> = async ({ props }) => {

    return async () => {
        return (
            <div class="options-menu right-to-left-appear" style={{ height: `${props.viewportHeight - 20}px` }}>
                <div class="option-header">{props.header}</div>
                <div class="select-wrapper">
                    {
                        props.options.map((option) => {
                            return <div class="select clickable" onClick={async () => await props.onSelect({ value: option })}>
                                <div>{option.name}</div>
                                <div class="separator"></div>
                                <div>{props.selectedOption.id === option.id && `✓`}</div>
                            </div>
                        })
                    }
                </div>
            </div>
        )
    }
};
