import { IDialogWaterfallStep, Session} from 'botbuilder';
import { BotFrameworkInstrumentation } from 'botbuilder-instrumentation';
import { QnAMakerRecognizer, QnAMakerDialog, IQnAMakerResults } from 'botbuilder-cognitiveservices';
import { config } from '../../config';
import { FaqBot } from '.';

export function createDialog(bot: FaqBot): IDialogWaterfallStep {
    return (session: Session, args?: any) => {
        const locale = session.preferredLocale();
        const dialogId = `qna-${locale}`;
        if (!bot.library.dialog(dialogId)) {
            bot.library.dialog(dialogId, createLocalizedDialog(bot, locale));
        }
        session.replaceDialog(dialogId, args);
    };
}

function createLocalizedDialog(bot: FaqBot, locale: string): QnAMakerDialog {
    const recognizer = createRecognizer(locale);
    const dialog = new QnAMakerDialog({
        recognizers: [recognizer],
        defaultMessage: 'qna.notFound',
        qnaThreshold: 0.3
    });
    dialog.respondFromQnAMakerResult = respondFromQnAMakerResult(bot.instrumentation);
    return dialog;
}

function createRecognizer(locale: string): QnAMakerRecognizer {
    return new QnAMakerRecognizer ({
            knowledgeBaseId: config.get('Faq_QnA_kbId_' + locale.toUpperCase()),
            authKey: config.get('Faq_QnA_kbSubscriptionKey'),
            endpointHostName: config.get('Faq_QnA_host'),
            top: 4
        });
}

function respondFromQnAMakerResult(instrumentation: BotFrameworkInstrumentation) {
    return (session: Session, qnaMakerResult: IQnAMakerResults) => {
        instrumentation.trackQNAEvent(session, session.message.text, qnaMakerResult.answers[0].questions[0], qnaMakerResult.answers[0].answer, qnaMakerResult.answers[0].score);
        session.send(qnaMakerResult.answers[0].answer);
    };
}