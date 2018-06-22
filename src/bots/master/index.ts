import * as path from 'path';
import * as fs from 'fs';
import { UniversalBot } from 'botbuilder';
import { BotFrameworkInstrumentation } from 'botbuilder-instrumentation';
import { DocumentDbClient, AzureBotStorage } from 'botbuilder-azure';
import { config } from '../../config';
import * as logger from '../../services/consoleLogger';
import { ChildBot } from '../childBot';
import * as master from './masterDialog';
import * as confirmation from './confirmationPrompt';

export class MasterBot extends UniversalBot {
    public childBots: Array<ChildBot>;
    public instrumentation: BotFrameworkInstrumentation;

    public async setup(): Promise<any> {
        this.setupStateStorage();
        this.setupLocalization();
        this.setupInstrumentation();
        this.setupEventListeners();
        this.setupDialogs();
        await this.setupChildBots();
    }

    private setupStateStorage() {
        const cosmosDbClient = new DocumentDbClient({
            host: config.get('COSMOSDB_host'),
            masterKey: config.get('COSMOSDB_key'),
            database: 'botdocs',
            collection: 'botdata'
        });
        const storage = new AzureBotStorage({ gzipData: false }, cosmosDbClient);
        this.set('storage', storage);
    }

    private setupLocalization() {
        this.set('localizerSettings', {
            botLocalePath: path.join(__dirname, '../../../src/bots/master/locale'),
            defaultLocale: "en"
        });
    }

    private setupInstrumentation() {
        this.use({
            botbuilder: logger.onMessageReceived,
            send: logger.onMessageSent
        });

        this.instrumentation = new BotFrameworkInstrumentation({
            instrumentationKey: config.get('BotDevAppInsightsKey'),
            sentiments: {
                key: config.get('CG_SENTIMENT_KEY')
            },
            autoLogOptions: {
                autoCollectExceptions: true
                }
            });

        this.instrumentation.monitor(this);
    }

    private setupEventListeners() {
        this.on('conversationUpdate', (message) => {
            if (message.membersAdded.find(m => m.id === message.user.id)) {
                this.loadSession(message.address, (err, session) => {
                    session.preferredLocale(session.userData.locale || "en");
                    session.send('conversationUpdate.userConnected');
                });
            }
        });
    }

    private setupDialogs() {
        this.dialog('/', master.createDialog(this));
        this.dialog('confirmation', confirmation.createDialog(this));
    }

    private async setupChildBots(): Promise<void> {
        this.childBots = [];
        const pathToBots = path.join(__dirname, '..');
        const botDirectories = fs
            .readdirSync(pathToBots)
            .filter(file => fs.statSync(path.join(pathToBots, file)).isDirectory());
        botDirectories.forEach(async botDirectory => {
            if (botDirectory !== 'master') {
                try {
                    const module = await import(path.join('..', botDirectory));
                    const childBotClass = module[Object.keys(module)[0]] as any;
                    const childBot = new childBotClass.prototype.constructor(this.instrumentation) as ChildBot;
                    this.library(childBot.library);
                    this.childBots.push(childBot);
                    console.log(`Child bot library '${childBot.library.name}' has been loaded`);
                } catch (err) {
                    console.log(err);
                }
            }
        });
    }
}