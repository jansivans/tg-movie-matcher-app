export const component: DraymanComponent<{ src: string; title?: string; overview?: string; }> = async ({ props }) => {

    return async () => {
        return (
            <div class="lottie-animation">
                <lottie-player autoplay loop src={props.src}></lottie-player>
                {!!props.title && <div class="title">{props.title}</div>}
                {!!props.overview && <div class="overview">{props.overview}</div>}
            </div>
        )
    }
};
