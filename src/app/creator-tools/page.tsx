
import { getTool } from "@/lib/registry";
import { pageMetadata } from "@/lib/seo";
import { ToolLayout } from "@/components/ui";
import { CreatorToolsIsland } from "@/components/tools/creator-tools/CreatorToolsIsland";

export const metadata = pageMetadata({
  title:
    "Creator Tools — Title Ideas, Hooks, Description Templates & Hashtag Organiser",
  description:
    "Free template-based helpers for creators: video title variations, hook ideas, a YouTube description skeleton and a hashtag/keyword organiser. Runs in your browser.",
  path: "/creator-tools",
});

const FAQS = [
  {
    question: "Is this an AI title generator?",
    answer:
      "No. These are honest template-based helpers: your topic is combined with fixed, proven title and hook patterns, entirely in your browser. Nothing is sent to a server and there is no AI model involved. The results are starting points to edit, not finished copy.",
  },
  {
    question: "How do I write a good YouTube title?",
    answer:
      "Good titles are specific, honest and give the viewer a clear reason to click: a promised outcome, a number, a question or a strong point of view. Generate a batch of variations here, pick the two or three that best match what the video actually delivers, then tighten the wording. Avoid clickbait that the video cannot back up — it hurts watch time and channel trust.",
  },
  {
    question: "What is a hook and why does it matter?",
    answer:
      "The hook is the first line of your video or post — roughly the first 5 to 15 seconds. Most viewers decide whether to keep watching in that window, so a hook that raises a question, makes a bold claim or promises a clear payoff has an outsized effect on retention.",
  },
  {
    question: "What should a YouTube description include?",
    answer:
      "A strong first line (it shows in search results), a short summary of what the viewer will learn, chapter timestamps for longer videos, links to resources you mention, and a small set of relevant hashtags. The description skeleton here lays out exactly those sections with placeholders to fill in.",
  },
  {
    question: "How many hashtags should I use?",
    answer:
      "Fewer, relevant hashtags beat long spammy lists. On YouTube only the first three hashtags show above the title, and using more than 60 causes all of them to be ignored. Three to five well-chosen tags is a sensible default on most platforms.",
  },
  {
    question: "Is my text uploaded anywhere?",
    answer:
      "No. Everything on this page runs locally in your browser — your topics, keywords and generated text never leave your device. There is no account, no server processing and no tracking of what you type.",
  },
];

export default function CreatorToolsPage() {
  return (
    <ToolLayout
      tool={getTool("creator-tools")!}
      explanation={
        <>
          <h3>What these helpers do</h3>
          <p>
            Each tab combines your inputs with a fixed set of patterns that
            experienced creators use again and again. Because the templates
            are fixed, the same inputs always produce the same results —
            there is no AI, no randomness and nothing leaves your browser.
            Treat every result as a first draft to edit in your own voice.
          </p>
          <h3>Titles</h3>
          <p>
            Enter your topic, pick a tone (how-to, listicle, story or bold)
            and optionally an audience. You get ten title patterns filled in
            with your topic — compare them side by side and keep the ones
            that honestly describe your content.
          </p>
          <h3>Hooks</h3>
          <p>
            Hooks are opening lines designed to keep someone watching or
            reading past the first few seconds. Choose a style — educational,
            story, contrarian or question — and your subject is slotted into
            each proven opening pattern.
          </p>
          <h3>Description skeleton</h3>
          <p>
            The description builder lays out the sections a good YouTube
            description needs: a hook line, a &ldquo;what you&rsquo;ll
            learn&rdquo; list, optional chapter timestamps, an optional links
            block and a hashtag line derived from your topic. Everything in
            square brackets is a placeholder for you to replace.
          </p>
          <h3>Keyword &amp; hashtag organiser</h3>
          <p>
            Paste a messy list of phrases separated by commas or new lines.
            The organiser trims whitespace, removes duplicates (ignoring
            case), separates hashtags from plain keywords, normalises
            hashtags to a single <strong>#</strong> with no spaces, and sorts
            each group shortest first so they are easy to scan and copy.
          </p>
        </>
      }
      faqs={FAQS}
      disclaimer={
        <>
          These are template-based helpers, not AI, and the output is a
          starting point rather than finished copy. Results are generated
          entirely in your browser and nothing you type is uploaded or
          stored. Always check that titles and descriptions honestly reflect
          your content and each platform&rsquo;s current rules.
        </>
      }
    >
      <CreatorToolsIsland />
    </ToolLayout>
  );
}
