import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import express from 'express';
import MovieDB from 'node-themoviedb';
import { genres, yearOptions } from './utils';

export const Server: DraymanServer = async ({ EventHub, app }) => {
    app.use('/node_modules', (req, res, next) => express.static('node_modules')(req, res, next));
    const mdb = new MovieDB(process.env.MOVIE_DB_API_KEY);
    const tgToken = process.env.BOT_TOKEN;
    const bot = new Telegraf(tgToken);
    bot.launch();
    bot.on(message(), (ctx) => {
        return ctx.replyWithHTML(`🎬 <b>Welcome to Movie Matcher!</b> 🎥

Choose your genres and years, and <b>swipe through</b> our top movie picks. 

To match with <b>friends</b> share the <b>app link</b> - t.me/movie_matcher_bot/app.

If you're in the mood for <b>solo</b> discovery, use the <b>menu button</b> 

When everyone <b>swipes right</b> on a movie, it's popcorn time! 

Dive in and elevate your movie nights!
`);
    });
    const stages = {};
    const defaultStage = {
        users: [],
        movieOptions: {
            genre: structuredClone(genres[0]),
            year: structuredClone(yearOptions[0]),
        },
        state: 'setup',
        movies: [],
        selectedMovie: null,
    };

    const updateMovieSelectionState = (chatInstanceId) => {
        const stage = stages[chatInstanceId];
        const { users, movies } = stage;
        const likedMovieIdCounts = users
            .flatMap(user => user.likedMovieIds)
            .reduce((acc, movieId) => (acc[movieId] = (acc[movieId] || 0) + 1, acc), {});
        const unanimouslyLikedMovieId = Object
            .keys(likedMovieIdCounts)
            .find(movieId => likedMovieIdCounts[movieId] === users.length);
        let newState;
        if (unanimouslyLikedMovieId) {
            stage.selectedMovie = movies.find(movie => movie.id == unanimouslyLikedMovieId);
            newState = 'movieSelected';
            for (const user of stage.users) {
                let text = `🍿 <b>Movie Match Alert!</b> 🍿

Good news! You${stage.users.length > 1 ? ` and ${stage.users.filter(x => x.connectionId !== user.connectionId).map(x => x.user.username).join(', ')}` : ``} have matched on <b>${stage.selectedMovie.title}</b>! 🎬

Want to know more about this movie? Check out all the details <a href="https://www.themoviedb.org/movie/${stage.selectedMovie.id}">here</a>.

Happy watching!`;
                bot.telegram.sendMessage(user.user.id, text, { parse_mode: 'HTML' });
            }
        } else {
            const movieIdCounts = users
                .flatMap(user => [...user.likedMovieIds, ...user.dislikedMovieIds])
                .reduce((acc, movieId) => (acc[movieId] = (acc[movieId] || 0) + 1, acc), {});
            if (movies.every(movie => movieIdCounts[movie.id] === users.length)) {
                newState = 'movieNotSelected';
            }
        }
        if (newState) {
            stage.state = newState;
            users.forEach(user => {
                user.likedMovieIds = [];
                user.dislikedMovieIds = [];
            });
        }
    }

    return {
        enterStage: async ({ initData }) => {
            if (!stages[initData.chat_instance]) {
                stages[initData.chat_instance] = structuredClone(defaultStage);
            }
            if (!stages[initData.chat_instance].users.find(x => x.connectionId === initData.connectionId)) {
                initData.likedMovieIds = [];
                initData.dislikedMovieIds = [];
                stages[initData.chat_instance].users.push(initData);
            }
            await EventHub.emit('stageUpdated', { stage: stages[initData.chat_instance] }, initData.chat_instance);
        },
        exitStage: async ({ initData }) => {
            if (stages[initData.chat_instance]) {
                stages[initData.chat_instance].users = stages[initData.chat_instance].users.filter(x => x.connectionId !== initData.connectionId);
            }
            if (stages[initData.chat_instance].users.length === 0) {
                delete stages[initData.chat_instance];
            } else {
                if (stages[initData.chat_instance].state === 'movieSelection') {
                    updateMovieSelectionState(initData.chat_instance);
                }
                await EventHub.emit('stageUpdated', { stage: stages[initData.chat_instance] }, initData.chat_instance);
            }
        },
        restartStage: async ({ initData }) => {
            stages[initData.chat_instance] = {
                ...structuredClone(defaultStage),
                users: structuredClone(stages[initData.chat_instance].users),
                movieOptions: structuredClone(stages[initData.chat_instance].movieOptions),
            };
            await EventHub.emit('stageUpdated', { stage: stages[initData.chat_instance] }, initData.chat_instance);
        },
        changeMovieOption: async ({ initData, option, value }) => {
            stages[initData.chat_instance].movieOptions[option] = value;
            await EventHub.emit('stageUpdated', { stage: stages[initData.chat_instance] }, initData.chat_instance);
        },
        startMovieSelection: async ({ initData }) => {
            if (stages[initData.chat_instance].state !== 'movieSelection') {
                stages[initData.chat_instance].state = 'movieSelection';
                const { genre, year } = stages[initData.chat_instance].movieOptions;
                const query: any = { page: 1, };
                if (genre.id !== 'Any') {
                    query.with_genres = genre.id.toString();
                }
                if (year.id !== 'Any') {
                    query['primary_release_date.gte'] = year.start;
                    query['primary_release_date.lte'] = year.end;
                }
                let movies = (await mdb.discover.movie({ query })).data.results;
                stages[initData.chat_instance].movies = movies.sort(() => Math.random() - 0.5);
                await EventHub.emit('stageUpdated', { stage: stages[initData.chat_instance] }, initData.chat_instance);
            }
        },
        rateMovie: async ({ initData, movieId, isLike }) => {
            const user = stages[initData.chat_instance].users.find(x => x.connectionId === initData.connectionId);
            user[isLike ? 'likedMovieIds' : 'dislikedMovieIds'].push(movieId);
            updateMovieSelectionState(initData.chat_instance);
            if (stages[initData.chat_instance].state === 'movieSelected' || stages[initData.chat_instance].state === 'movieNotSelected') {
                await EventHub.emit('stageUpdated', { stage: stages[initData.chat_instance] }, initData.chat_instance);
            }
        },
    };
};