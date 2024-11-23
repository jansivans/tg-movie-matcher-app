import { nanoid } from 'nanoid';
import { verifyInitData } from '../utils';

export const component: DraymanComponent = async ({ Browser, ComponentInstance, EventHub, forceUpdate, Server }) => {
    const data = await Browser.getTelegramData();
    const initData = data.initDataUnsafe;
    initData.connectionId = nanoid();
    let optionState: 'tool' | 'location';
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
            } else if (stage.state === 'miningSimulation') {
                optionState = null;
                await Browser.setMainButtonParams({ is_visible: false, });
                await Browser.setBackButtonVisibility({ visible: true });
            } else if (stage.state === 'miningCompleted') {
                await Browser.explode();
                await Browser.setBackButtonVisibility({ visible: true });
            } else if (stage.state === 'miningNotCompleted') {
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
            await Server.startMiningSimulation({ initData });
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

        if (stage.state === 'miningNotCompleted') {
            return <lottieAnimation
                src="stickers/crying.json"
                title="Mining Standstill!"
                overview="It looks like a consensus wasn't reached on a mining option. No worries! Tap 'Back' and try tweaking your options for a better result!"
            />
        }

        if (stage.state === 'miningSimulation' && !stage.miningOptions.length) {
            return <lottieAnimation
                src="stickers/not_found.json"
                title="Oops, No Mining Options Found!"
                overview="We couldn't find any mining options matching your search. Tap 'Back' and try tweaking your options for a better result!"
            />
        }

        if (stage.state === 'setup' && !optionState) {
            return (
                <div class="main-wrapper left-to-right-appear" style={{ height: `${viewportHeight}px` }}>
                    <lottieAnimation src="stickers/main.json" />
                    <div class="main">
                        <div class="option-header">Mining options</div>
                        <div class="select-wrapper">
                            <optionsButton
                                buttonLabel="Tool"
                                selectedLabel={stage.miningOptions.tool.name}
                                onSelect={async () => {
                                    optionState = 'tool';
                                    await Browser.setBackButtonVisibility({ visible: true });
                                    await forceUpdate();
                                }}
                            />
                            <optionsButton
                                buttonLabel="Location"
                                selectedLabel={stage.miningOptions.location.name}
                                onSelect={async () => {
                                    optionState = 'location';
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

        if (stage.state === 'setup' && optionState === 'tool') {
            return <optionsMenu
                header="Tool"
                options={tools}
                viewportHeight={viewportHeight}
                onSelect={async ({ value }) => await Server.changeMiningOption({ initData, option: 'tool', value })}
                selectedOption={stage.miningOptions.tool}
            />
        }

        if (stage.state === 'setup' && optionState === 'location') {
            return <optionsMenu
                header="Location"
                options={locations}
                viewportHeight={viewportHeight}
                onSelect={async ({ value }) => await Server.changeMiningOption({ initData, option: 'location', value })}
                selectedOption={stage.miningOptions.location}
            />
        }

        if (stage.state === 'miningSimulation' && !!stage.miningOptions.length) {
            return (
                <div>
                    <div class="swipi-cards-wrapper">
                        <rg-swipi-cards onScStackFinish={[async () => { cardsFinished = true; await forceUpdate(); }, { debounce: 1000 }]} >
                            {
                                stage.miningOptions.map((option) => {
                                    return (
                                        <rg-swipi-card
                                            onScSwipeLeft={async () => await Server.rateMiningOption({ optionId: option.id, initData, isLike: false })}
                                            onScSwipeRight={async () => await Server.rateMiningOption({ optionId: option.id, initData, isLike: true })}
                                        >
                                            <miningCard miningOption={option} viewportHeight={viewportHeight} />
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
                            overview="We're waiting for others to finalize their mining picks. Grab some coffee and we'll be ready soon!"
                        />
                    }
                </div>
            )
        }

        if (stage.state === 'miningCompleted') {
            return (
                <div class="selected-mining-wrapper">
                    <div class="selected-mining">
                        <miningCard miningOption={stage.selectedMiningOption} viewportHeight={viewportHeight} />
                    </div>
                </div>
            )
        }
    }
}
