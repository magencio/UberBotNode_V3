import { Library } from "botbuilder";
import { BotFrameworkInstrumentation } from 'botbuilder-instrumentation';

export interface ChildBot {
    library: Library;
}