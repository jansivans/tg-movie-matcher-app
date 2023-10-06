import { nanoid } from 'nanoid';
import { genres, yearOptions, verifyInitData } from '../utils';

export const component: DraymanComponent = async ({ Browser, ComponentInstance, EventHub, forceUpdate, Server }) => {
    const data = await Browser.getTelegramData();
    const initData = data.initDataUnsafe;
    initData.connectionId = nanoid();
    let optionState: 'genre' | 'year';
    let stage;
    let cardsFinished = false;
    let previousState;
    let viewportHeight = data.viewportHeight;

    if (!verifyInitData(data.initData)) {
        await Browser.setMainButtonParams({ is_visible: false, });

        return () => {
            return <lottieAnimation
                src="stickers/not_found.json"
                title="Oops, Something Went Wrong!"
                overview="We couldn't verify your identity."
            />
        }
    }

    EventHub.on('stageUpdated', async (data) => {
        const newStage = data.stage;
        stage = data.stage;
        if (previousState !== newStage) {
            if (stage.state === 'setup') {
                cardsFinished = false;
                await Browser.setMainButtonParams({ text: 'Start', is_visible: true, });
                await Browser.setBackButtonVisibility({ visible: !!optionState });
            } else if (stage.state === 'movieSelection') {
                optionState = null;
                await Browser.setMainButtonParams({ is_visible: false, });
                await Browser.setBackButtonVisibility({ visible: true });
            } else if (stage.state === 'movieSelected') {
                await Browser.explode();
                await Browser.setBackButtonVisibility({ visible: true });
            } else if (stage.state === 'movieNotSelected') {
                await Browser.setBackButtonVisibility({ visible: true });
            }
            previousState = stage.state;
        }
        await forceUpdate();
    }, initData.chat_instance);

    ComponentInstance.onInit = async () => {
        await Server.enterStage({ initData });
    }

    ComponentInstance.onDestroy = async () => {
        await Server.exitStage({ initData });
    }

    Browser.events({
        onMainButtonClick: async () => {
            await Server.startMovieSelection({ initData });
        },
        onBackButtonClick: async () => {
            if (stage.state === 'setup') {
                optionState = null;
                await forceUpdate();
            } else {
                await Server.restartStage({ initData });
            }
            await Browser.setBackButtonVisibility({ visible: false });
        },
        onViewportChanged: async (data) => {
            viewportHeight = data.viewportHeight;
            await forceUpdate();
        },
    })

    return () => {

        if (!stage) {
            return <></>;
        }

        if (stage.state === 'movieNotSelected') {
            return <lottieAnimation
                src="stickers/crying.json"
                title="Cinema Standstill!"
                overview="It looks like a consensus wasn't reached on a movie choice. No worries! Tap 'Back' and try tweaking your search options for a better result!"
            />
        }

        if (stage.state === 'movieSelection' && !stage.movies.length) {
            return <lottieAnimation
                src="stickers/not_found.json"
                title="Oops, No Flicks Found!"
                overview="We couldn't find any movies matching your search. Tap 'Back' and try tweaking your search options for a better result!"
            />
        }

        if (stage.state === 'setup' && !optionState) {
            return (
                <div class="main-wrapper left-to-right-appear" style={{ height: `${viewportHeight}px` }}>
                    <lottieAnimation src="stickers/main.json" />
                    <div class="main">
                        <div class="option-header">Movie options</div>
                        <div class="select-wrapper">
                            <optionsButton
                                buttonLabel="Genre"
                                selectedLabel={stage.movieOptions.genre.name}
                                onSelect={async () => {
                                    optionState = 'genre';
                                    await Browser.setBackButtonVisibility({ visible: true });
                                    await forceUpdate();
                                }}
                            />
                            <optionsButton
                                buttonLabel="Year"
                                selectedLabel={stage.movieOptions.year.name}
                                onSelect={async () => {
                                    optionState = 'year';
                                    await Browser.setBackButtonVisibility({ visible: true });
                                    await forceUpdate();
                                }}
                            />
                        </div>
                        <div class="option-header">Connected users</div>
                        <div class="select-wrapper">
                            {
                                stage.users.map((user) => {
                                    return <div class="select"><div>{user.user.username}</div></div>;
                                })
                            }
                        </div>
                    </div>
                </div>
            )
        }

        if (stage.state === 'setup' && optionState === 'genre') {
            return <optionsMenu
                header="Genre"
                options={genres}
                viewportHeight={viewportHeight}
                onSelect={async ({ value }) => await Server.changeMovieOption({ initData, option: 'genre', value })}
                selectedOption={stage.movieOptions.genre}
            />
        }

        if (stage.state === 'setup' && optionState === 'year') {
            return <optionsMenu
                header="Year"
                options={yearOptions}
                viewportHeight={viewportHeight}
                onSelect={async ({ value }) => await Server.changeMovieOption({ initData, option: 'year', value })}
                selectedOption={stage.movieOptions.year}
            />
        }

        if (stage.state === 'movieSelection' && !!stage.movies.length) {
            return (
                <div>
                    <div class="swipi-cards-wrapper">
                        <rg-swipi-cards onScStackFinish={[async () => { cardsFinished = true; await forceUpdate(); }, { debounce: 1000 }]}>
                            {
                                stage.movies.map((movie) => {
                                    return (
                                        <rg-swipi-card
                                            onScSwipeLeft={async () => await Server.rateMovie({ movieId: movie.id, initData, isLike: false })}
                                            onScSwipeRight={async () => await Server.rateMovie({ movieId: movie.id, initData, isLike: true })}
                                        >
                                            <movieCard movie={movie} viewportHeight={viewportHeight} />
                                        </rg-swipi-card>
                                    )
                                })
                            }
                        </rg-swipi-cards>
                    </div>
                    {
                        (!!cardsFinished) && <lottieAnimation
                            src="stickers/waiting.json"
                            title="Hold Tight!"
                            overview="We're waiting for others to finalize their movie picks. Grab some popcorn and we'll be ready soon!"
                        />
                    }
                </div>
            )
        }

        if (stage.state === 'movieSelected') {
            return (
                <div class="selected-movie-wrapper">
                    <div class="selected-movie">
                        <movieCard movie={stage.selectedMovie} viewportHeight={viewportHeight} />
                    </div>
                </div>
            )
        }
    }
}

