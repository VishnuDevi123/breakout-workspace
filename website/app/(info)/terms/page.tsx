import type { Metadata } from "next";
import Link from "next/link";

import PageTitle from "../PageTitle";
import { APP_NAME, DEVELOPER, EFFECTIVE_DATE, SUPPORT_EMAIL } from "../site-info";

export const metadata: Metadata = {
  title: "Terms of use · Breakout Workspace",
  description: "The terms for using Breakout Workspace, in plain words.",
};

export default function TermsPage() {
  return (
    <>
      <PageTitle eyebrow="Legal" meta={`Effective ${EFFECTIVE_DATE}`}>
        Terms of <em className="lp-accent">use</em>
      </PageTitle>
      <article className="info-doc lp-rise">
        <p>
          {APP_NAME} is a free Zoom App I ({DEVELOPER}) built to make breakout sessions easier to run. These terms are the
          ground rules for using it. By adding or using the app, you agree to them. If something here doesn&apos;t sit
          right with you, please don&apos;t use the app, and feel free to tell me why.
        </p>

        <div className="info-summary">
          <p className="info-summary__title">The short version</p>
          <ul>
            <li>It&apos;s free, and you&apos;re welcome to use it for your meetings, classes and workshops.</li>
            <li>What you create stays yours.</li>
            <li>Be kind, follow the law, and don&apos;t try to break or misuse the app.</li>
            <li>I work hard to keep it running well, but I can&apos;t promise it will be perfect.</li>
          </ul>
        </div>

        <h2>What the app does</h2>
        <p>
          It helps a host plan breakout rounds, opens Zoom&apos;s breakout rooms with the right people in them, gives every
          room a clear task and activities, and lets the host follow each room as it works. It costs nothing. I may add,
          change or remove features over time, and I may pause or stop the service if I ever need to.
        </p>

        <h2>Who can use it</h2>
        <ul>
          <li>Anyone signed in to Zoom who is at least 16 years old.</li>
          <li>
            Your use also needs to follow{" "}
            <a href="https://www.zoom.com/en/trust/terms/" target="_blank" rel="noreferrer">
              Zoom&apos;s terms of service
            </a>{" "}
            and any rules your school or workplace has.
          </li>
        </ul>

        <h2>Your stuff stays yours</h2>
        <p>
          Plans, tasks, answers and ideas belong to whoever wrote them. You only let the app store them and show them to
          the people in your meeting, because that&apos;s what it needs to do its job. How long it keeps them and how to
          delete them is in the <Link href="/privacy">privacy policy</Link>.
        </p>

        <h2>Please don&apos;t</h2>
        <ul>
          <li>use the app to break the law, or to harass, threaten or harm anyone;</li>
          <li>share anything illegal or hateful, or anything you don&apos;t have the right to share;</li>
          <li>try to get at data that isn&apos;t yours, or probe, overload or attack the app;</li>
          <li>put personal or sensitive information into the AI builder.</li>
        </ul>
        <p>If someone does, I may limit or block their access to keep the app safe for everyone else.</p>

        <h2>About the AI builder</h2>
        <p>
          The AI builder turns a short description into a draft session, using ASU CreateAI. It&apos;s a helpful starting
          point, not the final word: drafts can be wrong or miss things, so look them over before you use them. Each host
          gets 20 prompts a day, and the builder may pause until the next month if its shared budget runs out. You can
          always build sessions by hand.
        </p>

        <h2>The honest fine print</h2>
        <p>
          I&apos;m one developer offering this for free. The app is provided &quot;as is&quot; and &quot;as
          available&quot;, without warranties of any kind, including that it fits a particular purpose or never has an
          outage or a bug. Meeting data is deleted when the meeting ends, so keep your own copy of anything you&apos;ll
          need later.
        </p>
        <p>
          As far as the law allows, I&apos;m not responsible for indirect or knock-on losses, or for lost data, that come
          from using the app, and my total responsibility for any claim is limited to US$100.
        </p>

        <h2>Zoom and this app</h2>
        <p>
          {APP_NAME} is an independent app built on Zoom&apos;s platform. Zoom is a trademark of Zoom Communications, Inc.
          For help with this app, please come to me rather than Zoom support.
        </p>

        <h2>Leaving</h2>
        <p>
          You can stop any time: remove the app at marketplace.zoom.us (Manage, then Added Apps, then Remove). Your saved
          templates and AI prompt count are deleted when you do. No hard feelings.
        </p>

        <h2>If these terms change</h2>
        <p>
          I&apos;ll post the new version here with a new date at the top. If you keep using the app after that, it means
          you&apos;re okay with the changes.
        </p>

        <h2>The legal bit</h2>
        <p>These terms are governed by the laws of the State of Arizona, United States.</p>

        <h2>Questions?</h2>
        <p>
          Just ask. Write to me at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
        <p className="info-doc__note">{DEVELOPER}, developer of {APP_NAME}</p>
      </article>
    </>
  );
}
