import chroma from 'chroma-js';
import { genres } from '../utils';

export const component: DraymanComponent<{
    movie: any;
    viewportHeight: number;
}> = async ({ props }) => {
    const ratingScale = chroma.scale(['#e64d44', '#32b545']).domain([0, 10]);

    return async () => {
        return (
            <div class="wrapper">
                <div class="fade-image" style={{ '--dynamic-bg-image': `url('https://image.tmdb.org/t/p/w1280/${props.movie.backdrop_path}')` }}>
                    {!!props.movie.vote_count && <div class="rating-circle" style={{ background: ratingScale(props.movie.vote_average).hex() }}>{props.movie.vote_average}</div>}
                </div>
                <div class="title">{props.movie.title}</div>
                <div class="genre">{`${props.movie.genre_ids.map(x => genres.find(xx => xx.id == x).name).join(', ')} | ${props.movie.release_date.slice(0, 4)}`}</div>
                <div class="overview" style={{ height: `${props.viewportHeight - 340}px` }}>
                    {(props.viewportHeight - 340 > 100) && <div class="content">{props.movie.overview}</div>}
                </div>
            </div>
        )
    }
};
