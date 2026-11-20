import type { Metadata } from "next";
import Link from "next/link";

import PageTitle from "../PageTitle";
import { APP_NAME, DEVELOPER, SUPPORT_EMAIL } from "../site-info";

export const metadata: Metadata = {
  title: "Support · Breakout Workspace",
  description: "Get help with Breakout Workspace: quick fixes and how to reach the developer.",
};

export default function SupportPage() {
  return (
    <>
      <PageTitle eyebrow="Support" meta={`Help with ${APP_NAME}`}>
        Need a <em className="lp-accent">hand?</em>
      </PageTitle>
      <article className="info-doc lp-rise">
        <p>
          Something not working, or not sure how to do something? You&apos;re in the right place. Most problems have a
          quick fix below. If yours doesn&apos;t, write to me and I&apos;ll help you sort it out.
        </p>

        <div className="info-summary">
          <p className="info-summary__title">Write to me</p>
          <p>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
          <p>
            I read every message myself and reply within 2 business days. It helps if you tell me what you were trying to
            do, whether you were the host or a participant, your Zoom version (in Zoom, click your picture, then Check for
            updates), and add a screenshot if you can. Please never send passwords or meeting passcodes.
          </p>
        </div>

        <p>
          First time using the app? The <Link href="/docs">guide</Link> walks you through adding it, running a session,
          and removing it.
        </p>

        <h2>Quick fixes</h2>

        <h3>The app won&apos;t open, or shows an error</h3>
        <ul>
          <li>Update Zoom to the latest version. Older versions can miss features the app needs.</li>
          <li>Check that you&apos;re signed in to Zoom. Guests who aren&apos;t signed in can&apos;t use the app.</li>
          <li>Open it from Apps in the meeting toolbar. It runs inside Zoom, not in a web browser.</li>
        </ul>

        <h3>Rounds won&apos;t launch</h3>
        <ul>
          <li>Only the meeting host can launch rounds. Co-hosts can help with everything else.</li>
          <li>
            Breakout rooms need to be turned on for your Zoom account: in the Zoom web portal, go to Settings, then In
            Meeting (Advanced), then Breakout room. On a school or work account, your Zoom admin may need to switch it on
            for you.
          </li>
        </ul>

        <h3>Someone can&apos;t see their room</h3>
        <ul>
          <li>
            They need to join their room with Zoom&apos;s Breakout Rooms button. The app shows their task once
            they&apos;re in.
          </li>
          <li>
            People who joined after the round started show up under Not yet placed on the host&apos;s Rooms tab, ready to
            be placed.
          </li>
        </ul>

        <h3>The AI builder is busy or paused</h3>
        <ul>
          <li>Each host gets 20 AI prompts a day. The count resets at midnight UTC.</li>
          <li>The builder may pause until the next month if its shared monthly budget runs out.</li>
          <li>You can always build a session by hand or start from a template in the meantime.</li>
        </ul>

        <h2>Questions about your data</h2>
        <p>
          The <Link href="/privacy">privacy policy</Link> explains what the app keeps and how to delete it. For anything
          else, just email me at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>

        <h2>Ideas and feedback</h2>
        <p>
          Have an idea that would make your sessions better, or something that felt clunky? I&apos;d genuinely love to hear
          it. Same address.
        </p>
        <p className="info-doc__note">{DEVELOPER}, developer of {APP_NAME}</p>
      </article>
    </>
  );
}
