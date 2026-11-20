import { Instrument_Serif } from "next/font/google";

import Footer from "../landing/Footer";
import "../landing/landing.css";
import InfoNav from "./InfoNav";
import "./info.css";

// The landing page's display serif, for the accent word in each page title.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

/** Shell for the guide, support and policy pages: the landing page's backdrop, bar and footer. */
export default function InfoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`lp-page ${instrumentSerif.variable}`}>
      <div className="lp-backdrop" aria-hidden="true">
        <span className="lp-backdrop__blob lp-backdrop__blob--indigo" />
        <span className="lp-backdrop__blob lp-backdrop__blob--teal" />
        <span className="lp-backdrop__blob lp-backdrop__blob--amber" />
      </div>
      <InfoNav />
      <main className="info-main">{children}</main>
      <Footer />
    </div>
  );
}
