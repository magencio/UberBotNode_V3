import * as restify from 'restify';
import { ChatConnector } from 'botbuilder';
import { config }  from './config';
import { MasterBot } from './bots/master';

// Create the bot
const connector = new ChatConnector({
    appId: config.get('MicrosoftAppId'),
    appPassword: config.get('MicrosoftAppPassword')
});
const bot = new MasterBot(connector);
bot.setup().then(() => {

    // Listen to activities sent to the bot
    const server = restify.createServer();
    server.use(restify.plugins.queryParser());
    server.listen(process.env.port || process.env.PORT || 3977, function () {
        console.log('%s listening to %s', server.name, server.url);
    });
    server.post('/api/messages', connector.listen());
});