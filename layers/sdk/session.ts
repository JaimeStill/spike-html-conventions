// The application SDK: the services application-branch apps share. This occupant stands in for
// the auth hook, a Lit reactive controller over the foundation.

import type { ReactiveController, ReactiveControllerHost } from "lit";

import { emit } from "../foundation/dom.js";

/** Holds the signed-in user for a host element and re-renders the host when it changes. */
export class SessionController implements ReactiveController {
  readonly host: ReactiveControllerHost & EventTarget;
  user: string | null = null;

  constructor(host: ReactiveControllerHost & EventTarget) {
    this.host = host;
    host.addController(this);
  }

  hostConnected(): void {}

  /** Clears the user and announces the sign-out from the host. */
  signOut(): void {
    this.user = null;
    this.host.requestUpdate();
    emit(this.host, "session-end", {});
  }
}
