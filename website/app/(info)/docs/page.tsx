import type { Metadata } from "next";
import Link from "next/link";

import PageTitle from "../PageTitle";
import { APP_NAME } from "../site-info";

export const metadata: Metadata = {
  title: "Guide · Breakout Workspace",
  description: "How to add Breakout Workspace, run your first session, and remove the app.",
};

export default function DocsPage() {
  return (
    <>
      <PageTitle eyebrow="Guide" meta={`Adding, using and removing ${APP_NAME}`}>
        Get <em className="lp-accent">started.</em>
      </PageTitle>
      <article className="info-doc lp-rise">
        <p>
          {APP_NAME} turns breakout rooms into a plan everyone can follow. The host sets up rounds with tasks and
          activities, the app opens Zoom&apos;s rooms with the right people in them, and every room sees exactly what to
          work on. This guide gets you from zero to your first session in a few minutes.
        </p>

        <h2>What you&apos;ll need</h2>
        <ul>
          <li>The Zoom desktop app for Windows or macOS, updated to the latest version.</li>
          <li>To be signed in to Zoom. Guests who aren&apos;t signed in can&apos;t use the app.</li>
          <li>
            If you&apos;re hosting: breakout rooms turned on in your Zoom settings (Settings, then In Meeting (Advanced),
            then Breakout room).
          </li>
        </ul>

        <h2>Add the app</h2>
        <ol>
          <li>Find {APP_NAME} on the Zoom App Marketplace and click Add.</li>
          <li>
            Zoom shows what the app is allowed to do. It asks to run inside your meetings and to know when people join,
            leave or move between rooms, which is how it shows who&apos;s in each room. Click Allow.
          </li>
          <li>
            That&apos;s it. In any meeting, click Apps in the toolbar and open {APP_NAME}. Participants who haven&apos;t
            added it yet are asked to add it the first time they open it.
          </li>
        </ol>
        <p>On a school or work account, your Zoom admin may need to approve the app first.</p>

        <h2>Run a session as the host</h2>
        <ol>
          <li>
            <strong>Plan it.</strong> Describe your session in a sentence, like &quot;45-minute team retro with three
            activities&quot;, and the AI drafts the rounds, rooms, tasks and activities for you. Prefer to do it yourself?
            Build it by hand, or start from a template or one of your saved sessions.
          </li>
          <li>
            <strong>Shape each round.</strong> Set a timer and the number of rooms, and choose whether groups stay the same,
            change every round, or are set by you. Give each room a task, steps, a checklist and activities.
          </li>
          <li>
            <strong>Launch.</strong> Press Launch workflow. The app creates Zoom&apos;s breakout rooms, puts people in them
            and opens them, all in one go.
          </li>
          <li>
            <strong>Keep an eye on the rooms.</strong> The Rooms tab shows who&apos;s in each room and how far along they
            are. Rooms can tell you they need more time or that they&apos;re done. Add or take away time with + and −, or
            end the round when you&apos;re ready.
          </li>
          <li>
            <strong>Adjust on the fly.</strong> On the Session tab, edit the task, add activities, and send a poll or quiz
            to every room while the round runs.
          </li>
          <li>
            <strong>Wrap up.</strong> End the workflow from the home screen. Ran a great session? Save it as a template and
            reuse it next time.
          </li>
        </ol>
        <p>
          Co-hosts can lend a hand: they can edit tasks, change the timer and follow the rooms. Starting, ending and
          skipping rounds stays with the host.
        </p>

        <h2>Join in as a participant</h2>
        <ol>
          <li>Open {APP_NAME} from Apps in the meeting toolbar.</li>
          <li>When the host starts a round, join your room with Zoom&apos;s Breakout Rooms button.</li>
          <li>
            The app shows your room, your task and how much time is left. Press Open your room&apos;s tasks to answer
            prompts, add ideas to your room&apos;s shared board, tick off the checklist and join polls and quizzes.
          </li>
          <li>Need more time, or finished early? Tap Need more time or We&apos;re done and your host will see it.</li>
          <li>
            Dropped out of the meeting? Rejoin and you&apos;ll be back in your room with your work right where you left
            it.
          </li>
        </ol>

        <h2>Remove the app</h2>
        <ol>
          <li>
            Go to{" "}
            <a href="https://marketplace.zoom.us/user/installed" target="_blank" rel="noreferrer">
              marketplace.zoom.us
            </a>{" "}
            and sign in.
          </li>
          <li>Click Manage, then Added Apps.</li>
          <li>Find {APP_NAME} and click Remove.</li>
        </ol>
        <p>
          When you remove it, your saved templates and AI prompt count are deleted right away. Everything from your
          meetings is already gone, because it&apos;s deleted when each meeting ends. If your admin added the app for your
          whole organization, they&apos;re the one who can remove it. The <Link href="/privacy">privacy policy</Link> has
          the full details.
        </p>

        <h2>Stuck?</h2>
        <p>
          The <Link href="/support">support page</Link> has quick fixes for common problems, and a way to reach me
          directly.
        </p>
      </article>
    </>
  );
}
