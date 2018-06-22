import { Library, IDialogWaterfallStep, Session, IntentDialog, LuisRecognizer, IDialogResult, IIntentRecognizerResult, Message, SuggestedActions, CardAction } from "botbuilder";
import { config } from "../../config";
import { FaqBot } from ".";

export function createDialog(bot: FaqBot): IDialogWaterfallStep {
    return (session: Session, args?: any) => {
        const locale = session.preferredLocale();
        const dialogId = `faq-${locale}`;
        if (!bot.library.dialog(dialogId)) {
            bot.library.dialog(dialogId, createLocalizedDialog(bot, locale));
        }
        session.replaceDialog(dialogId, args);
    };
}

function createLocalizedDialog(bot: FaqBot, locale: string): IntentDialog {
    const recognizer = createRecognizer(locale);
    bot.instrumentation.monitor(null, recognizer);
    return new IntentDialog({ recognizers: [recognizer] })
        .onBegin(onBegin(bot.library))
        .matches('command.finish', onFinish(bot.library))
        .onDefault(onAnythingElse(bot));
}

function createRecognizer(locale: string): LuisRecognizer {
    return new LuisRecognizer(
        config.get('Faq_LUIS_apiHostName')
        + '/' + config.get('Faq_LUIS_appId_' + locale.toUpperCase())
        + '?subscription-key=' + config.get('Faq_LUIS_apiKey')
        + '&q=');
}

function onBegin(library: Library): IDialogWaterfallStep {
    return (session: Session, args: any, next: () => void) => {
        session.send(new Message(session)
            .text('faq.welcome')
            .suggestedActions(getSuggestedActions(library, session)));
    };
}

function onFinish(library: Library): IDialogWaterfallStep[] {
    return [
        (session: Session, luisResults: IIntentRecognizerResult) => {
            const finishConfirmation = session.localizer.gettext(session.preferredLocale(), 'faq.finishConfirmation', library.name);
            session.beginDialog('*:confirmation', finishConfirmation);
        },
        (session: Session, results: IDialogResult<any>) => {
            switch (results.response) {
                case true:
                    session.send('faq.finishConfirmed');
                    session.endDialog();
                    break;
                default:
                    session.send('faq.finishUnconfirmed');
                    whatNow(library, session);
                    break;
            }
        }
    ];
}

function onAnythingElse(bot: FaqBot): IDialogWaterfallStep[] {
    return [
        (session: Session, luisResults: IIntentRecognizerResult) => {
            session.beginDialog('qna');
        },
        (session: Session, results: IDialogResult<any>) => {
            whatNow(bot.library, session);
        }
    ];
}

function whatNow(library: Library, session: Session) {
    session.send(new Message(session)
        .text('faq.whatNow')
        .suggestedActions(getSuggestedActions(library, session)));
}

function getSuggestedActions (library: Library, session: Session): SuggestedActions {
    const finish = session.localizer.gettext(session.preferredLocale(), 'faq.finishOption', library.name);
    return SuggestedActions.create(session, [
        CardAction.imBack(session, finish, finish)]);
}