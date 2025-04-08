const { app } = require('@azure/functions');
const axios = require('axios');
const qs = require('qs');

const CLIENT_ID = process.env.REDDIT_CLIENT_ID || 'bzG6zHjC23GSenSIXe0M-Q';
const SECRET = process.env.REDDIT_SECRET || 'DoywW0Lcc26rvDforDKkLOSQsUUwYA';
const USERNAME = process.env.REDDIT_USERNAME || 'Major-Noise-6411';

app.http('httpTrigger', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('A função HTTP foi chamada.');

        const subreddit = request.query.get('subreddit');
        const hashtag = request.query.get('hashtag');

        if (!subreddit || !hashtag) {
            return {
                status: 400,
                body: "Parâmetros 'subreddit' e 'hashtag' são obrigatórios."
            };
        }

        try {
            const password = process.env.REDDIT_PASSWORD;

            if (!password) {
                throw new Error("A variável de ambiente REDDIT_PASSWORD não está definida.");
            }

            const tokenResponse = await axios.post('https://www.reddit.com/api/v1/access_token',
                qs.stringify({
                    grant_type: 'password',
                    username: USERNAME,
                    password: password
                }),
                {
                    auth: {
                        username: CLIENT_ID,
                        password: SECRET
                    },
                    headers: {
                        'User-Agent': 'MyAPI/0.0.1',
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            const token = tokenResponse.data.access_token;

            const redditRes = await axios.get(`https://oauth.reddit.com/r/${subreddit}/new`, {
                headers: {
                    'Authorization': `bearer ${token}`,
                    'User-Agent': 'MyAPI/0.0.1'
                },
                params: { limit: 50 }
            });

            const posts = redditRes.data.data.children;

            const filtrados = posts
                .filter(p => {
                    const title = p.data.title || '';
                    const selftext = p.data.selftext || '';
                    return title.toLowerCase().includes(hashtag.toLowerCase()) ||
                           selftext.toLowerCase().includes(hashtag.toLowerCase());
                })
                .map(p => {
                    return `Subreddit: ${p.data.subreddit}\nTítulo: ${p.data.title}\nTexto: ${p.data.selftext}\nUpvote Ratio: ${p.data.upvote_ratio}\nUps: ${p.data.ups}\nScore: ${p.data.score}\n\n`;
                });

            if (filtrados.length === 0) {
                return {
                    status: 404,
                    body: "Nenhum post encontrado com essa hashtag."
                };
            }

            // Juntar os posts filtrados numa única string
            const responseBody = filtrados.join('\n');

            return {
                status: 200,
                headers: { "Content-Type": "text/plain" },
                body: responseBody
            };

        } catch (error) {
            context.log.error('Erro:', error);
            return {
                status: 500,
                body: `Erro interno: ${error.message}`
            };
        }
    }
});
