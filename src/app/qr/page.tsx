import type { Metadata } from "next";

import { ToolLayout } from "@/components/ui";
import { getTool } from "@/lib/registry";
import { QrIsland } from "@/components/tools/qr/QrIsland";

export const metadata: Metadata = {
  title: "Free QR Code Generator — URL, Wi-Fi, Email & Phone (PNG / SVG)",
  description:
    "Create QR codes for links, text, Wi-Fi, email and phone numbers in your browser. Download PNG or SVG — free, no watermark, no account, codes never expire.",
  alternates: { canonical: "/qr" },
};

const FAQS = [
  {
    question: "Do these QR codes expire or stop working?",
    answer:
      "No. This tool makes static QR codes: your link, text or Wi-Fi details are encoded directly into the pattern itself, with no redirect service in between. The code works forever — a URL code only 'breaks' if the website it points to goes offline.",
  },
  {
    question: "Is it really free, with no watermark or sign-up?",
    answer:
      "Yes. Codes are generated entirely in your browser — nothing you type is sent to a server, there's no account, no watermark and no scan tracking. You can use the downloads commercially.",
  },
  {
    question: "How does a Wi-Fi QR code work?",
    answer:
      "It encodes your network name, security type and password in a standard format that phone cameras understand. When a guest scans it, their phone offers to join the network without them typing anything. Choose WPA for almost every modern router — it covers WPA, WPA2 and WPA3. Note the password is readable by anyone who scans the code, so only share it with people you'd give the password to anyway.",
  },
  {
    question: "Should I download PNG or SVG?",
    answer:
      "PNG suits screens and everyday documents. SVG is a vector format that stays perfectly sharp at any size, so it's the better choice for print — posters, menus, flyers and packaging — and for graphic design software.",
  },
  {
    question: "What does the error correction setting do?",
    answer:
      "QR codes include redundant data so they still scan when partially dirty, damaged or obscured. Level L tolerates about 7% damage, M about 15%, Q about 25% and H about 30%. Higher levels make the pattern denser, so M is the best all-rounder; pick H for small printed labels that may get scuffed.",
  },
  {
    question: "How big should a QR code be when printed?",
    answer:
      "A useful rule of thumb is scanning distance divided by 10 — so a code scanned from 30 cm away should be at least 3 cm wide, and a poster read from 3 metres needs a code about 30 cm wide. Never print below about 2 × 2 cm, keep the white margin around the code, and always test a printed sample with a couple of different phones.",
  },
  {
    question: "Why won't my QR code scan?",
    answer:
      "The usual culprits are printing it too small, trimming the white margin (the quiet zone), low contrast between the code and its background, or encoding a very long text that makes the pattern extremely dense. Keep the content short, keep the margin at 2–4 modules or more, use dark-on-light colours, and test before you distribute it.",
  },
];

function Explanation() {
  return (
    <>
      <p>
        A QR code is simply text encoded as a grid of black and white modules.
        What happens when someone scans it depends entirely on how that text
        is formatted — this tool builds the correct format for you, then
        renders the code on your device. Nothing you type is sent anywhere.
      </p>

      <h3>What each mode does</h3>
      <ul>
        <li>
          <strong>URL</strong> — encodes a web address. Scanning opens it in
          the browser. If you leave the scheme off (just
          &quot;example.com&quot;), https:// is added for you.
        </li>
        <li>
          <strong>Text</strong> — encodes plain text exactly as typed.
          Scanning shows the text on screen: good for serial numbers, notes or
          instructions.
        </li>
        <li>
          <strong>Wi-Fi</strong> — encodes your network name, security type
          and password. Scanning offers to join the network — ideal for
          guests, holiday lets, cafés and offices.
        </li>
        <li>
          <strong>Email</strong> — encodes a mailto: link with an optional
          subject and message. Scanning opens the person&apos;s email app with
          everything pre-filled.
        </li>
        <li>
          <strong>Phone</strong> — encodes a tel: link. Scanning opens the
          dialler with the number ready to call.
        </li>
      </ul>

      <h3>Size, margin and error correction</h3>
      <p>
        The size options control the pixel dimensions of the download — use
        512px or more for print, or grab the SVG, which scales to any size
        with no loss of sharpness. The margin is the blank &quot;quiet
        zone&quot; around the code that scanners use to find its edges — keep
        it at 2–4 modules or more. Error correction adds redundancy so the
        code still scans when smudged or partially covered; higher levels are
        more robust but denser.
      </p>

      <h3>Printing tips</h3>
      <ul>
        <li>
          Size the code for its scanning distance — roughly one tenth of how
          far away people will stand.
        </li>
        <li>Use dark modules on a light background; avoid low contrast.</li>
        <li>
          Don&apos;t crop the white margin or overlap the code with graphics.
        </li>
        <li>Prefer the SVG download for anything going to a printer.</li>
        <li>
          Test a printed sample with more than one phone before producing
          hundreds of copies.
        </li>
      </ul>
    </>
  );
}

export default function QrPage() {
  const tool = getTool("qr")!;
  return (
    <ToolLayout
      tool={tool}
      explanation={<Explanation />}
      faqs={FAQS}
      disclaimer={
        <>
          Always test a QR code with a real phone — ideally more than one —
          before printing or sharing it widely. Codes are generated on your
          device and nothing you enter is stored or transmitted; remember that
          anything encoded in a code (including a Wi-Fi password) can be read
          by anyone who scans it.
        </>
      }
    >
      <QrIsland />
    </ToolLayout>
  );
}
