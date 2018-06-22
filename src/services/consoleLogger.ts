import { Session, IMessage } from "botbuilder";

export function onMessageReceived (session: Session, next: Function) {
    console.log(session.message.text);
    next();
}

export function onMessageSent (event: IMessage, next: Function) {
    console.log(event.text);
    next();
}