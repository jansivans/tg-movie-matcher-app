import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import express from 'express';
import MiningSimulationAPI from 'mining-simulation-api';

export const Server: DraymanServer = async ({ EventHub, app }) => {
    app.use('/node_modules', (req, res, next) => express.static('node_modules')(req, res, next));
    const miningAPI = new MiningSimulationAPI(process.env.MINING_API_KEY);
    const tgToken = process.env.BOT_TOKEN;
    const bot = new Telegraf(tgToken);
    bot.launch();
    bot.on(message(), (ctx) => {
        return ctx.replyWithHTML(`🎬 <b>Welcome to Mining Simulation!</b> 🎥

Simulate the mining process and experience the thrill of mining.

To simulate mining with <b>friends</b> share the <b>app link</b> - t.me/mining_simulation_bot/app.

If you're in the mood for <b>solo</b> mining, use the <b>menu button</b>.

When everyone <b>completes the mining process</b>, it's time to celebrate!

Dive in and experience the mining simulation!
`);
    });
    const stages = {};
    const defaultStage = {
        users: [],
        miningOptions: {
            tool: { id: 'Any', name: 'Any' },
            location: { id: 'Any', name: 'Any' },
        },
        state: 'setup',
        miningOptions: [],
        selectedMiningOption: null,
    };

    const updateMiningSimulationState = (chatInstanceId) => {
        const stage = stages[chatInstanceId];
        const { users, miningOptions } = stage;
        const likedMiningOptionIdCounts = users
            .flatMap(user => user.likedMiningOptionIds)
            .reduce((acc, miningOptionId) => (acc[miningOptionId] = (acc[miningOptionId] || 0) + 1, acc), {});
        const unanimouslyLikedMiningOptionId = Object
            .keys(likedMiningOptionIdCounts)
            .find(miningOptionId => likedMiningOptionIdCounts[miningOptionId] === users.length);
        let newState;
        if (unanimouslyLikedMiningOptionId) {
            stage.selectedMiningOption = miningOptions.find(miningOption => miningOption.id == unanimouslyLikedMiningOptionId);
            newState = 'miningCompleted';
            for (const user of stage.users) {
                let text = `⛏️ <b>Mining Match Alert!</b> ⛏️

Good news! You${stage.users.length > 1 ? ` and ${stage.users.filter(x => x.connectionId !== user.connectionId).map(x => x.user.username).join(', ')}` : ``} have matched on <b>${stage.selected
