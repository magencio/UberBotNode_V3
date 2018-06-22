import { Library, IDialogWaterfallStep, Session, IntentDialog, LuisRecognizer, IDialogResult, IIntentRecognizerResult, Message, SuggestedActions, CardAction } from 'botbuilder';
import { config } from '../../config';
import { ComplaintsBot } from '.';

export function createDialog(bot: ComplaintsBot): IDialogWaterfallStep {
    return (session: Session, args?: any) => {
        const locale = session.preferredLocale();
        const dialogId = `complaintsRoot-${locale}`;
        if (!bot.library.dialog(dialogId)) {
            bot.library.dialog(dialogId, createLocalizedDialog(bot, locale));
        }
        session.replaceDialog(dialogId, args);
    };
}

function createLocalizedDialog(bot: ComplaintsBot, locale: string): IntentDialog {
    const recognizer = createRecognizer(locale);
    bot.instrumentation.monitor(null, recognizer);
    return new IntentDialog({ recognizers: [recognizer] })
        .onBegin(onBegin(bot.library))
        .matches('command.finish', onFinish(bot.library))
        .onDefault(onAnythingElse(bot));
}

function createRecognizer(locale: string): LuisRecognizer {
    return new LuisRecognizer(
        config.get('Complaints_LUIS_apiHostName')
        + '/' + config.get('Complaints_LUIS_appId_' + locale.toUpperCase())
        + '?subscription-key=' + config.get('Complaints_LUIS_apiKey')
        + '&q=');
}

function onBegin(library: Library): IDialogWaterfallStep {
    return (session: Session, args: any, next: () => void) => {
        session.send(new Message(session)
            .text('complaints.welcome')
            .suggestedActions(getSuggestedActions(library, session)));
    };
}

function onFinish(library: Library): IDialogWaterfallStep[] {
    return [
        (session: Session, luisResults: IIntentRecognizerResult) => {
            const finishConfirmation = session.localizer.gettext(session.preferredLocale(), 'complaints.finishConfirmation', library.name);
            session.beginDialog('*:confirmation', finishConfirmation);
        },
        (session: Session, results: IDialogResult<any>) => {
            switch (results.response) {
                case true:
                    session.send('complaints.finishConfirmed');
                    session.endDialog();
                    break;
                default:
                    session.send('complaints.finishUnconfirmed');
                    whatNow(library, session);
                    break;
            }
        }
    ];
}

function onAnythingElse(bot: ComplaintsBot): IDialogWaterfallStep {
    return (session: Session, luisResults: IIntentRecognizerResult) => {
        bot.instrumentation.trackGoalTriggeredEvent('Complaint', { text: session.message.text }, session);
        session.send('complaints.received');
        whatNow(bot.library, session);
    };
}

function whatNow(library: Library, session: Session) {
    session.send(new Message(session)
        .text('complaints.whatNow')
        .suggestedActions(getSuggestedActions(library, session)));
}

function getSuggestedActions (library: Library, session: Session): SuggestedActions {
    const finish = session.localizer.gettext(session.preferredLocale(), 'complaints.finishOption', library.name);
    return SuggestedActions.create(session, [
        CardAction.imBack(session, finish, finish)]);
}