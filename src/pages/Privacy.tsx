import { LegalPage } from "../components/LegalPage";
import { APP_NAME } from "../lib/brand";

export const CONTACT_EMAIL = "syudhvir14@gmail.com";

// Plain-language privacy policy — what's stored, where, and how to delete it.
export function Privacy() {
  return (
    <LegalPage
      title="Privacy"
      intro="Short version: your training data is yours. We run no database of it."
      effective="October 29, 2026"
      sections={[
        [
          "What we store",
          <p key="a">
            Your workouts, plans, body weight and measurements. {APP_NAME} has no server-side database: without an account everything stays in your browser or phone, and with Google sign-in it is saved in your own Google Drive. It never reaches us.
          </p>,
        ],
        [
          "Signing in with Google",
          <>
            <p key="a">
              When you choose "Continue with Google", {APP_NAME} asks for your email address and basic profile (to show who is signed in) and the <b>drive.file</b> permission. That permission only lets the app see and edit files it created itself; it can't read anything else in your Drive.
            </p>
            <p key="b">
              The app saves your data as one file, <code>ironward-data.json</code>, plus any progress photos, in an "{APP_NAME}" folder in your Drive. Your sign-in token is kept in your browser. The only server involved is a small function that exchanges Google's sign-in codes for tokens using our app's secret. It does not store, log or read your data.
            </p>
          </>,
        ],
        [
          "Google user data",
          <p key="a">
            {APP_NAME}'s use and transfer of information received from Google APIs adheres to the{" "}
            <a className="font-semibold text-primary" href="https://developers.google.com/terms/api-services-user-data-policy#limited-use" target="_blank" rel="noreferrer">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. Data from your Google account is used only to sign you in and to store your own training data in your own Drive. It is never sold, shared with others, used for advertising, or used to train AI models.
          </p>,
        ],
        [
          "Progress photos",
          <p key="a">
            Signed in with Google, each photo is saved as an image file in the same "{APP_NAME}" folder in your Drive, and deleting one in the app moves it to your Drive trash. As a guest they stay on the device you took them on. Photos are never sent to us and aren't included in backup files.
          </p>,
        ],
        ["What we don't do", <p key="a">No ads, no selling or sharing your data, no third-party trackers in the app.</p>],
        [
          "The AI coach",
          <p key="a">
            {APP_NAME} doesn't send your data to any AI. When you use the AI coach, you copy a prompt yourself and paste it into the assistant you choose. What you share there is between you and that service.
          </p>,
        ],
        [
          "Your control",
          <>
            <p key="a">Export everything (CSV or a backup file) any time from Settings.</p>
            <p key="b">
              "Delete my data" in Settings moves the {APP_NAME} folder in your Drive to the trash (recoverable for 30 days) and revokes the app's access. You can also remove {APP_NAME} at any time at{" "}
              <a className="font-semibold text-primary" href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
                myaccount.google.com/permissions
              </a>
              .
            </p>
          </>,
        ],
        [
          "Contact",
          <p key="a">
            Questions or requests: <a className="font-semibold text-primary" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>,
        ],
      ]}
    />
  );
}
