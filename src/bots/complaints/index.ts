import * as path from 'path';
import { Library } from 'botbuilder';
import { BotFrameworkInstrumentation } from 'botbuilder-instrumentation';
import { ChildBot } from '../childBot';
import * as complaints from './complaintsDialog';

export class ComplaintsBot implements ChildBot {
    public library: Library;
    public instrumentation: BotFrameworkInstrumentation;

    constructor(instrumentation: BotFrameworkInstrumentation) {
        this.instrumentation = instrumentation;
        this.library = new Library('complaints');
        this.library.localePath(path.join(__dirname, '../../../src/bots/complaints/locale'));
        this.library.dialog('/', complaints.createDialog(this));
    }
}