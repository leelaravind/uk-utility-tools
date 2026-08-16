
import { ToolLayout } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";
import { getTool } from "@/lib/registry";
import { CvMatchTool } from "@/components/tools/cv-match/CvMatchTool";

export const metadata = pageMetadata({
  title:
    "CV Keyword Match Checker — Compare Your CV to a Job Description",
  description:
    "Paste your CV and a job description to see a keyword match score, missing skills and hard requirements — analysed privately in your browser, never uploaded.",
  path: "/cv-match",
});

const FAQS = [
  {
    question: "Is this an ATS checker?",
    answer:
      "It is a keyword-coverage approximation, not a real Applicant Tracking System. Employers use many different ATS products, most of which rank or filter on their own criteria alongside human review. A good score here suggests your CV speaks the advert's language, but it is not a guarantee of passing any particular system or getting an interview.",
  },
  {
    question: "Is my CV uploaded anywhere?",
    answer:
      "No. The whole analysis runs as JavaScript in your browser — your CV and the job description are never sent to a server, stored, or shared. You can even load the page, disconnect from the internet, and the checker still works.",
  },
  {
    question: "What counts as a good match score?",
    answer:
      "There is no universal threshold, but as a rule of thumb a score above roughly 60 suggests your CV already reflects most of the advert's key language, while a low score usually means the CV was not tailored to this particular role. Focus on the highest-priority missing keywords rather than chasing 100.",
  },
  {
    question: "Should I just paste the missing keywords into my CV?",
    answer:
      "Only add a keyword if it is genuinely true of you, and add it in context — inside a bullet point describing real experience. Never invent skills, and avoid repeating the same term over and over: the checker warns you about keyword stuffing because recruiters and filtering software can penalise it.",
  },
  {
    question: "Does it understand synonyms and abbreviations?",
    answer:
      "Partly. A curated dictionary maps common aliases — for example JS to JavaScript, ReactJS to React, 'driving license' to 'driving licence' — and recognises 150+ skills across tech, trades, healthcare, retail, admin and soft skills. It cannot catch every synonym, so skim the missing list with common sense before acting on it.",
  },
  {
    question: "Does it work for non-tech jobs?",
    answer:
      "Yes. The skills dictionary deliberately covers UK trades (CSCS, NVQ, Gas Safe), healthcare (NMC, DBS, safeguarding), retail and hospitality (EPOS, food hygiene), office and admin work (Sage, Xero, minute taking) as well as soft skills, so care workers, tradespeople and administrators get useful results too.",
  },
];

export default function CvMatchPage() {
  return (
    <ToolLayout
      tool={getTool("cv-match")!}
      explanation={
        <>
          <h3>How the match score is worked out</h3>
          <p>
            The checker reads the job description, breaks it into single words
            and two-to-three-word phrases, and removes filler words. Each
            remaining term is weighted by three signals: how often it appears,
            whether it sits on a requirement-style line (bullet points, or
            lines containing &ldquo;must&rdquo;, &ldquo;required&rdquo; or
            &ldquo;essential&rdquo;), and whether it is in a curated dictionary
            of 150+ real skills and qualifications. The top 25 weighted terms
            become the target list, and your score is the share of that total
            weight found in your CV — so missing a heavily emphasised essential
            skill costs more than missing a word mentioned once in passing.
          </p>
          <h3>What else the checker looks for</h3>
          <ul>
            <li>
              <strong>Hard requirements</strong> — patterns like &ldquo;5+
              years&rdquo;, &ldquo;degree in computer science&rdquo;, driving
              licence, right to work and certifications such as CSCS, DBS or
              NVQ, each checked against your CV.
            </li>
            <li>
              <strong>Alias matching</strong> — JS counts as JavaScript,
              ReactJS as React, &ldquo;customer services&rdquo; as customer
              service, so abbreviation differences do not cost you points.
            </li>
            <li>
              <strong>Keyword stuffing</strong> — any term repeated more than
              eight times in your CV triggers a warning, because unnatural
              repetition reads badly to both software and humans.
            </li>
            <li>
              <strong>Prioritised gaps</strong> — missing keywords are sorted
              by weight, so you fix the most valuable gaps first.
            </li>
          </ul>
          <h3>Why keyword tailoring matters in UK applications</h3>
          <p>
            Many UK employers — from NHS trusts to supermarkets to tech firms —
            use applicant tracking software or a recruiter&rsquo;s quick skim as
            the first filter, and both look for the advert&rsquo;s own language.
            Tailoring each CV honestly to the specific job description is one of
            the highest-value fifteen-minute tasks in a job search. This tool
            simply makes the gap visible; the judgement about what to add stays
            with you.
          </p>
          <h3>Privacy</h3>
          <p>
            Everything runs locally in your browser. Your CV and the job
            description are never uploaded, stored or logged — nothing leaves
            your device.
          </p>
        </>
      }
      faqs={FAQS}
      disclaimer={
        <>
          This checker is an illustrative keyword comparison, not an ATS
          simulation and not a guarantee of interviews or job offers. Employers
          use many different systems alongside human judgement. Your CV and the
          job description are analysed entirely on your device and are never
          uploaded or stored.
        </>
      }
    >
      <CvMatchTool />
    </ToolLayout>
  );
}
