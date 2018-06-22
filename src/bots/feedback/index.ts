import * as path from 'path';
import { Library } from 'botbuilder';
import { BotFrameworkInstrumentation } from 'botbuilder-instrumentation';
import { ChildBot } from '../childBot';
import * as feedback from './feedbackDialog';

export class FeedbackBot implements ChildBot {
    public library: Library;
    public instrumentation: BotFrameworkInstrumentation;

    constructor(instrumentation: BotFrameworkInstrumentation) {
        this.instrumentation = instrumentation;
        this.library = new Library('feedback');
        this.library.localePath(path.join(__dirname, '../../../src/bots/feedback/locale'));
        this.library.dialog('/', feedback.createDialog(this));
    }
}