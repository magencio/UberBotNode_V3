import { Library, IDialogWaterfallStep, Session, IntentDialog, LuisRecognizer, IDialogResult, IIntentRecognizerResult, Message, SuggestedActions, CardAction } from "botbuilder";
import { config } from "../../config";
import { FeedbackBot } from ".";

export function createDialog(bot: FeedbackBot): IDialogWaterfallStep {
    return (session: Session, args?: any) => {
        const locale = session.preferredLocale();
        const dialogId = `feedbackRoot-${locale}`;
        if (!bot.library.dialog(dialogId)) {
            bot.library.dialog(dialogId, createLocalizedDialog(bot, locale));
        }
        session.replaceDialog(dialogId, args);
    };
}

function createLocalizedDialog(bot: FeedbackBot, locale: string): IntentDialog {
    const recognizer = createRecognizer(locale);
    bot.instrumentation.monitor(null, recognizer);
    return new IntentDialog({ recognizers: [recognizer] })
        .onBegin(onBegin(bot.library))
        .matches('command.finish', onFinish(bot.library))
        .onDefault(onAnythingElse(bot));
}

function createRecognizer(locale: string): LuisRecognizer {
    return new LuisRecognizer(
        config.get('Feedback_LUIS_apiHostName')
        + '/' + config.get('Feedback_LUIS_appId_' + locale.toUpperCase())
        + '?subscription-key=' + config.get('Feedback_LUIS_apiKey')
        + '&q=');
}

function onBegin(library: Library): IDialogWaterfallStep {
    return (session: Session, args: any, next: () => void) => {
        session.send(new Message(session)
            .text('feedback.welcome')
            .suggestedActions(getSuggestedActions(library, session)));
    };
}

function onFinish(library: Library): IDialogWaterfallStep[] {
    return [
        (session: Session, luisResults: IIntentRecognizerResult) => {
            const finishConfirmation = session.localizer.gettext(session.preferredLocale(), 'feedback.finishConfirmation', library.name);
            session.beginDialog('*:confirmation', finishConfirmation);
        },
        (session: Session, results: IDialogResult<any>) => {
            switch (results.response) {
                case true:
                    session.send('feedback.finishConfirmed');
                    session.endDialog();
                    break;
                default:
                    session.send('feedback.finishUnconfirmed');
                    whatNow(library, session);
                    break;
            }
        }
    ];
}

function onAnythingElse(bot: FeedbackBot): IDialogWaterfallStep {
    return (session: Session, luisResults: IIntentRecognizerResult) => {
        bot.instrumentation.trackGoalTriggeredEvent('Feedback', { text: session.message.text }, session);
        session.send('feedback.received');
        whatNow(bot.library, session);
    };
}

function whatNow(library: Library, session: Session) {
    session.send(new Message(session)
        .text('feedback.whatNow')
        .suggestedActions(getSuggestedActions(library, session)));
}

function getSuggestedActions (library: Library, session: Session): SuggestedActions {
    const finish = session.localizer.gettext(session.preferredLocale(), 'feedback.finishOption', library.name);
    return SuggestedActions.create(session, [
        CardAction.imBack(session, finish, finish)]);
}