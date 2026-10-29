import { LegalPage } from "../components/LegalPage";
import { APP_NAME } from "../lib/brand";
import { CONTACT_EMAIL } from "./Privacy";

export function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={`The rules for using ${APP_NAME}. By using it, you agree to them.`}
      effective="October 29, 2026"
      sections={[
        [
          `What ${APP_NAME} is`,
          <p key="a">
            {APP_NAME} is a personal workout tracker. You can use it as a guest, with data kept only in your browser or phone, or sign in with Google so your data is saved in your own Google Drive. The Privacy page explains exactly how your data is handled.
          </p>,
        ],
        [
          "Your account",
          <p key="a">
            Guest mode creates no account. Google sign-in uses your Google account, which is also governed by Google's own terms. You are responsible for keeping your sign-in secure.
          </p>,
        ],
        [
          "Acceptable use",
          <p key="a">
            Don't try to access anyone else's data, interfere with how the service runs, or use the Google sign-in for anything other than storing your own {APP_NAME} data in your own Drive.
          </p>,
        ],
        [
          "Not medical advice",
          <p key="a">
            Training plans, load suggestions and anything from the AI coach are general information, not medical or professional advice. Exercise carries risk of injury. Check with a doctor before starting a program, and stop if something hurts.
          </p>,
        ],
        [
          "Your data and backups",
          <p key="a">
            Guest data lives only on your device and can be lost if you clear your browser or lose the phone, so export a backup now and then. Signed-in data lives in your Google Drive, so it is subject to Google's availability and your own actions there. We can't recover data for you.
          </p>,
        ],
        [
          "No warranty",
          <p key="a">
            {APP_NAME} is provided "as is", without warranties of any kind, and may be unavailable or contain errors. To the extent the law allows, we are not liable for indirect or consequential damages or for lost data arising from your use of it.
          </p>,
        ],
        [
          "Changes",
          <p key="a">We may update these terms. Continuing to use {APP_NAME} after a change means you accept the new version.</p>,
        ],
        [
          "Contact",
          <p key="a">
            <a className="font-semibold text-primary" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>,
        ],
      ]}
    />
  );
}
