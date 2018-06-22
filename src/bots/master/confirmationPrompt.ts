import { LuisRecognizer, IntentDialog, Message, Session, CardAction, SuggestedActions, ResumeReason, IDialogWaterfallStep, IIntentRecognizerResult } from 'botbuilder';
import { BotFrameworkInstrumentation } from 'botbuilder-instrumentation';
import { config } from '../../config';
import { MasterBot } from '../master';

export function createDialog(bot: MasterBot): IDialogWaterfallStep {
    return (session: Session, args?: any) => {
        const locale = session.preferredLocale();
        const dialogId = `confirmation-${locale}`;
        if (!bot.dialog(dialogId)) {
            bot.dialog(dialogId, createLocalizedDialog(locale, bot.instrumentation));
        }
        session.replaceDialog(dialogId, args);
    };
}

function createLocalizedDialog(locale: string, instrumentation: BotFrameworkInstrumentation): IntentDialog {
    const recognizer = createRecognizer(locale);
    instrumentation.monitor(null, recognizer);
    return new IntentDialog({ recognizers: [recognizer] })
        .onBegin(onBegin)
        .matches('confirmation.yes', onYes)
        .matches('confirmation.no', onNo)
        .matches('command.cancel', onCancel)
        .onDefault(onUnknown(instrumentation));
}

function createRecognizer(locale: string): LuisRecognizer {
    return new LuisRecognizer(
        config.get('Master_LUIS_apiHostName')
        + '/' + config.get('Master_LUIS_appId_' + locale.toUpperCase())
        + '?subscription-key=' + config.get('Master_LUIS_apiKey')
        + '&q=');
}

function onBegin(session: Session, question: string) {
    session.send(new Message(session)
        .text(question)
        .suggestedActions(getSuggestedActions(session)));
}

function onYes(session: Session, luisResults: IIntentRecognizerResult) {
    session.endDialogWithResult({ response: true });
}

function onNo(session: Session, luisResults: IIntentRecognizerResult) {
    session.endDialogWithResult({ response: false });
}

function onCancel(session: Session, luisResults: IIntentRecognizerResult) {
    session.endDialogWithResult({ resumed: ResumeReason.canceled });
}

function onUnknown(instrumentation: BotFrameworkInstrumentation): IDialogWaterfallStep {
    return (session: Session, luisResults: IIntentRecognizerResult) => {
        instrumentation.trackCustomEvent('MBFEvent.CustomEvent.Unknown', { text: session.message.text, luisResults: luisResults }, session);
        session.send(new Message(session)
            .text('confirmation.unknown')
            .suggestedActions(getSuggestedActions(session)));
    };
}

function getSuggestedActions(session: Session): SuggestedActions {
    const yes = session.localizer.gettext(session.preferredLocale(), 'confirmation.yesOption');
    const no = session.localizer.gettext(session.preferredLocale(), 'confirmation.noOption');
    const cancel = session.localizer.gettext(session.preferredLocale(), 'confirmation.cancelOption');
    return SuggestedActions.create(session, [
        CardAction.imBack(session, yes, yes),
        CardAction.imBack(session, no, no),
        CardAction.imBack(session, cancel, cancel)]);
}