const axios = require('axios');
const qs = require('qs');

// Idealmente estas variáveis também vêm de variáveis de ambiente no Azure
const CLIENT_ID = process.env.REDDIT_CLIENT_ID || 'bzG6zHjC23GSenSIXe0M-Q';
const SECRET = process.env.REDDIT_SECRET || 'DoywW0Lcc26rvDforDKkLOSQsUUwYA';
const USERNAME = process.env.REDDIT_USERNAME || 'Major-Noise-6411';

async function getToken() {
    const password = process.env.REDDIT_PASSWORD;

    if (!password) {
        throw new Error("A variável de ambiente REDDIT_PASSWORD não está definida.");
    }

    const response = await axios.post('https://www.reddit.com/api/v1/access_token',
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

    return response.data.access_token;
}

module.exports = async function (request, context) {
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
        const token = await getToken();

        const response = await axios.get(`https://oauth.reddit.com/r/${subreddit}/${hashtag}`, {
            headers: {
                'Authorization': `bearer ${token}`,
                'User-Agent': 'MyAPI/0.0.1'
            },
            params: { limit: 20 }
        });

        const posts = response.data.data.children;
        const filtrados = posts
            .filter(p => {
                const title = p.data.title || '';
                const selftext = p.data.selftext || '';
                return title.toLowerCase().includes(hashtag.toLowerCase()) ||
                       selftext.toLowerCase().includes(hashtag.toLowerCase());
            })
            .map(p => ({
                subreddit: p.data.subreddit,
                title: p.data.title,
                text: p.data.selftext,
                upvote_ratio: p.data.upvote_ratio,
                ups: p.data.ups,
                score: p.data.score
            }));

        if (filtrados.length === 0) {
            return {
                status: 404,
                body: "Nenhum post encontrado com essa hashtag."
            };
        }

        return {
            status: 200,
            headers: { "Content-Type": "application/json" },
            body: filtrados
        };

    } catch (error) {
        context.log.error('Erro:', error);
        return {
            status: 500,
            body: `Erro interno: ${error.message}`
        };
    }
};
