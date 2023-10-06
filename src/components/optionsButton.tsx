export const component: DraymanComponent<{
    buttonLabel: string;
    selectedLabel: string;
    onSelect: () => Promise<void>;
}> = async ({ props }) => {

    return async () => {
        return (
            <div class="select clickable" onclick={async () => await props.onSelect()}>
                <div>{props.buttonLabel}</div>
                <div class="separator"></div>
                <div>{props.selectedLabel} ›</div>
            </div>
        )
    }
};
