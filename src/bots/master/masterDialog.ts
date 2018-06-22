import { Session, IntentDialog, LuisRecognizer, Message, SuggestedActions, CardAction, IIntentRecognizerResult, IDialogResult, IDialogWaterfallStep, Prompts, ListStyle, EntityRecognizer, ResumeReason } from "botbuilder";
import { BotFrameworkInstrumentation } from 'botbuilder-instrumentation';
import { config } from '../../config';
import { MasterBot } from '.';

const languages: { [id: string] : string; } = { "English": "en", "Español": "es" };

export function createDialog(bot: MasterBot): IDialogWaterfallStep {
    return (session: Session, args?: any) => {
        const locale = session.userData.locale || "en";
        session.preferredLocale(locale, (err: Error) => {
            const dialogId = `masterRoot-${locale}`;
            if (!bot.dialog(dialogId)) {
                bot.dialog(dialogId, createLocalizedDialog(bot, locale));
            }
            session.replaceDialog(dialogId, args);
        });
    };
}

function createLocalizedDialog(bot: MasterBot, locale: string): IntentDialog {
    const recognizer = createRecognizer(locale);
    bot.instrumentation.monitor(null, recognizer);
    return new IntentDialog({ recognizers: [recognizer] })
        .onBegin(onBegin)
        .matches('master.hi', onHi)
        .matches('master.home', onHome)
        .matches('master.language', onLanguage(bot))
        .onDefault(onAnythingElse(bot));
}

function createRecognizer(locale: string): LuisRecognizer {
    return new LuisRecognizer(
        config.get('Master_LUIS_apiHostName')
        + '/' + config.get('Master_LUIS_appId_' + locale.toUpperCase())
        + '?subscription-key=' + config.get('Master_LUIS_apiKey')
        + '&q=');
}

function onBegin(session: Session, args: any, next: () => void) {
    if (args && args.languageChanged) {
        session.send('master.languageModified');
        whatNow(session);
    } else {
        next();
    }
}

function onHi(session: Session, luisResults: IIntentRecognizerResult) {
    session.send(new Message(session)
        .text('master.hi')
        .suggestedActions(getSuggestedActions(session)));
}

function onHome(session: Session, luisResults: IIntentRecognizerResult) {
    whatNow(session);
}

function onLanguage(bot: MasterBot): IDialogWaterfallStep[] {
    return [
        (session: Session, luisResults: IIntentRecognizerResult, next: (results?: IDialogResult<any>) => void) => {
            const languageEntity = EntityRecognizer.findEntity(luisResults.entities, 'language');
            const language = languageEntity && languageEntity.entity;
            if (!language) {
                Prompts.choice(session, 'master.languageSelection', Object.keys(languages),
                    { listStyle: ListStyle.button, maxRetries: 3, retryPrompt: 'master.retryLanguageSelection' });
            } else {
                next({ response: { entity: language }});
            }
        },
        (session: Session, results: IDialogResult<any>) => {
            if (results.response) {
                let language = results.response.entity;
                language = language[0].toUpperCase() + language.slice(1);
                session.userData.locale = languages[language];
                createDialog(bot)(session, { languageChanged: true });
            } else {
                session.send('master.languageSelectionFailed');
                whatNow(session);
            }
        }
    ];
}

function onAnythingElse(bot: MasterBot): IDialogWaterfallStep[] {
    return [
        (session: Session, luisResults: IIntentRecognizerResult) => {
            const topIntent = luisResults.intent;
            const selectedBot = bot.childBots.find(bot => `child.${bot.library.name.toLowerCase()}` === topIntent);
            if (selectedBot) {
                session.beginDialog(`${selectedBot.library.name}:/`);
            } else {
                bot.instrumentation.trackCustomEvent('MBFEvent.CustomEvent.Unknown', { text: session.message.text, luisResults: luisResults }, session);
                session.send('master.unknown');
                whatNow(session);
            }
        },
        (session: Session, results: IDialogResult<any>) => {
            whatNow(session);
        }
    ];
}

function whatNow(session: Session) {
    session.send(new Message(session)
        .text('master.whatNow')
        .suggestedActions(getSuggestedActions(session)));
}

function getSuggestedActions(session: Session): SuggestedActions {
    const faq = session.localizer.gettext(session.preferredLocale(), 'master.faqOption');
    const feedback = session.localizer.gettext(session.preferredLocale(), 'master.feedbackOption');
    const complaints = session.localizer.gettext(session.preferredLocale(), 'master.complaintsOption');
    const language = session.localizer.gettext(session.preferredLocale(), 'master.languageOption');
    return SuggestedActions.create(session, [
        CardAction.imBack(session, faq, faq),
        CardAction.imBack(session, feedback, feedback),
        CardAction.imBack(session, complaints, complaints),
        CardAction.imBack(session, language, language)]);
}