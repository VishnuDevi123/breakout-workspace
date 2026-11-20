import type { Metadata } from "next";

import PageTitle from "../PageTitle";
import { APP_NAME, DEVELOPER, EFFECTIVE_DATE, SUPPORT_EMAIL } from "../site-info";

export const metadata: Metadata = {
  title: "Privacy policy · Breakout Workspace",
  description: "What Breakout Workspace keeps, why, for how long, and how to delete it, in plain words.",
};

export default function PrivacyPage() {
  return (
    <>
      <PageTitle eyebrow="Legal" meta={`Effective ${EFFECTIVE_DATE}`}>
        Privacy <em className="lp-accent">policy</em>
      </PageTitle>
      <article className="info-doc lp-rise">
        <p>
          Hi, I&apos;m {DEVELOPER}, and I built {APP_NAME}. You&apos;re trusting
          it with your meeting, so here is exactly what it keeps, why, and how
          to make it go away. No fine print.
        </p>

        <div className="info-summary">
          <p className="info-summary__title">The short version</p>
          <ul>
            <li>
              The app keeps only what it needs to run your breakout rooms.
            </li>
            <li>
              Everything about a meeting is deleted when the meeting ends, and
              never kept longer than 24 hours.
            </li>
            <li>It never sees your audio, video, chat or recordings.</li>
            <li>
              No ads, no tracking, no cookies, and your data is never sold.
            </li>
            <li>
              Remove the app and everything tied to your account is gone at
              once.
            </li>
          </ul>
        </div>

        <h2>What the app keeps, and why</h2>
        <table>
          <thead>
            <tr>
              <th>What</th>
              <th>Why it&apos;s needed</th>
              <th>How long it stays</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="What">
                Your name as it shows in Zoom, your role (host, co-host or
                participant), which room you&apos;re in, and the IDs Zoom uses
                for you in that meeting
              </td>
              <td data-label="Why it's needed">
                So the host can see who&apos;s in each room, you land back in
                your room if you rejoin, and nobody can pretend to be you or the
                host
              </td>
              <td data-label="How long it stays">
                Until the meeting ends, never more than 24 hours
              </td>
            </tr>
            <tr>
              <td data-label="What">
                The plan for the meeting: rounds, room names, tasks, activities,
                polls and quizzes
              </td>
              <td data-label="Why it's needed">
                So the session runs the way the host planned it
              </td>
              <td data-label="How long it stays">
                Until the meeting ends, never more than 24 hours
              </td>
            </tr>
            <tr>
              <td data-label="What">
                What rooms add during a round: answers, ideas on the shared
                board, checklist ticks, poll and quiz picks, and &quot;need more
                time&quot; or &quot;we&apos;re done&quot;
              </td>
              <td data-label="Why it's needed">
                So your room can work together, and the host can see how each
                room is doing
              </td>
              <td data-label="How long it stays">
                Until the meeting ends, never more than 24 hours
              </td>
            </tr>
            <tr>
              <td data-label="What">
                Templates a host chooses to save: just the plan, never people or
                answers
              </td>
              <td data-label="Why it's needed">
                So a host can reuse a good session in a later meeting
              </td>
              <td data-label="How long it stays">
                Until the host deletes it or removes the app
              </td>
            </tr>
            <tr>
              <td data-label="What">How many AI prompts a host used today</td>
              <td data-label="Why it's needed">
                To keep the daily limit of 20 prompts per host fair for everyone
              </td>
              <td data-label="How long it stays">
                Under 24 hours, or right away if the host removes the app
              </td>
            </tr>
          </tbody>
        </table>

        <h2>What the app never touches</h2>
        <p>
          Your email address, profile photo, audio, video, chat messages,
          recordings, meeting passcodes or payment details. The app also has no
          cookies, no analytics and no ads, and I will never sell or rent your
          data.
        </p>

        <h2>What Zoom tells the app</h2>
        <p>
          When you add the app, you allow Zoom to send it small notices: someone
          joined or left the meeting or a breakout room, someone&apos;s role
          changed, or the meeting ended. The app keeps only the details in the
          table above. Zoom also sends a notice when a meeting is created; the
          app throws that one away without saving anything. The app doesn&apos;t
          call Zoom for anything else and never stores your Zoom sign-in.
        </p>

        <h2>The AI builder</h2>
        <p>
          If a host asks the AI to draft a session, their request and the
          current plan (round names, room names, tasks and activities) are sent
          to Arizona State University&apos;s CreateAI AI platform,
          which passes it to an AI model to write the draft. Names and IDs of
          people in the meeting are never sent. The conversation isn&apos;t
          saved; only the day&apos;s prompt count is. A small favour: please
          don&apos;t type personal details into AI prompts.
        </p>

        <h2>Where it all lives</h2>
        <ul>
          <li>
            <strong>Amazon Web Services (DynamoDB, United States)</strong> holds
            the data, encrypted.
          </li>
          <li>
            <strong>Render</strong> runs the app&apos;s server.
          </li>
          <li>
            <strong>AWS Amplify</strong> serves the screens you see inside Zoom.
          </li>
          <li>
            <strong>ASU CreateAI</strong> writes AI drafts, as described above.
          </li>
        </ul>
        <p>
          These services may keep basic technical logs, such as IP addresses and
          times of requests, under their own policies. The app&apos;s own logs
          only note what kind of event happened, never names, IDs or what anyone
          wrote.
        </p>

        <h2>Keeping it safe</h2>
        <p>
          Everything travels over HTTPS (TLS 1.2 or higher) and is encrypted
          where it&apos;s stored. Every request must carry Zoom&apos;s signed
          proof of who you are and which meeting you&apos;re in, and every
          notice from Zoom must carry Zoom&apos;s signature, or the app refuses
          it. Only the app&apos;s server, and I as its operator, can reach the
          stored data.
        </p>

        <h2>Your data, your call</h2>
        <p>
          You can see, fix or delete your data, or tell me to stop using it.
          Here&apos;s how:
        </p>
        <ul>
          <li>
            <strong>Delete everything tied to you:</strong> remove the app at{" "}
            <a
              href="https://marketplace.zoom.us/user/installed"
              target="_blank"
              rel="noreferrer"
            >
              marketplace.zoom.us
            </a>{" "}
            (Manage, then Added Apps, then Remove). Your saved templates and AI
            prompt count are deleted right away.
          </li>
          <li>
            <strong>Delete one template:</strong> press Delete on it in the app.
          </li>
          <li>
            <strong>Meeting data</strong> takes care of itself: it&apos;s
            deleted when the meeting ends, or within 24 hours at most.
          </li>
          <li>
            <strong>Anything else:</strong> email me at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. I&apos;ll
            reply within 30 days, usually much sooner. I may ask you to confirm
            the Zoom account is yours first, so nobody else can ask for your
            data.
          </li>
        </ul>
        <p>
          Depending on where you live, you can also complain to your local data
          protection authority.
        </p>

        <h2>Kids</h2>
        <p>
          The app isn&apos;t meant for anyone under 16, and Zoom doesn&apos;t
          let people under 16 add Marketplace apps. I don&apos;t knowingly
          collect their data.
        </p>

        <h2>If this policy changes</h2>
        <p>
          I&apos;ll post the new version here with a new date at the top. If the
          change is a big one, I&apos;ll also say so on the app&apos;s
          Marketplace page.
        </p>

        <h2>Questions?</h2>
        <p>
          I&apos;m happy to explain anything here. Write to me at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
        <p className="info-doc__note">
          {DEVELOPER}, developer of {APP_NAME}
        </p>
      </article>
    </>
  );
}
