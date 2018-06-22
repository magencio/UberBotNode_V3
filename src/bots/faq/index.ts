import * as path from 'path';
import { Library } from 'botbuilder';
import { BotFrameworkInstrumentation } from 'botbuilder-instrumentation';
import { ChildBot } from '../childBot';
import * as faq from './faqDialog';
import * as qna from './qnaDialog';

export class FaqBot implements ChildBot {
    public library: Library;
    public instrumentation: BotFrameworkInstrumentation;

    constructor(instrumentation: BotFrameworkInstrumentation) {
        this.instrumentation = instrumentation;
        this.library = new Library('faq');
        this.library.localePath(path.join(__dirname, '../../../src/bots/faq/locale'));
        this.library.dialog('/', faq.createDialog(this));
        this.library.dialog('qna', qna.createDialog(this));
    }
}