
import { ToolLayout } from "@/components/ui";
import { pageMetadata } from "@/lib/seo";
import { getTool } from "@/lib/registry";
import { JobAnswerTool } from "@/components/tools/job-answer/JobAnswerTool";

export const metadata = pageMetadata({
  title: "Job Application Answer Builder — STAR & Interview Answer Helper",
  description:
    "Build tailored answers to job application and interview questions. Covers STAR, competency and motivation questions, gives three drafts plus a STAR breakdown, and keeps your details in your browser. A structured builder, not AI.",
  path: "/job-answer",
});

const FAQS = [
  {
    question: "Is this an AI answer generator?",
    answer:
      "No, and we will not pretend otherwise. There is no model behind it and no request leaves your browser. It is a composition engine: it works out what kind of question you have been asked, picks matching sentence patterns from a large library written by people, and weaves your own notes into the factual parts. That is why it can be specific about structure and honest about facts — it never has to guess what you achieved, because it only ever repeats what you typed.",
  },
  {
    question: "Will it invent achievements or numbers for me?",
    answer:
      "Never. The content library contains no figures at all — no percentages, no team sizes, no revenue, no timeframes. Where a strong answer needs a number, the draft prints a bracketed prompt asking you for your real one, and the results panel lists your own sentences back to you so you can see exactly which facts came from you. If you submit a draft with brackets still in it, that is a draft you have not finished.",
  },
  {
    question: "Why do I get a different answer each time I press the button?",
    answer:
      "Because one phrasing is not the right phrasing for everyone. Each build draws from the matching pattern library with a different seed, and recently used sentences are skipped, so pressing 'Another version' gives you a genuinely different route through the same structure. The same inputs and the same version number always reproduce the same draft, so nothing is lost if you reload.",
  },
  {
    question: "What is the STAR method, and when should I not use it?",
    answer:
      "STAR stands for Situation, Task, Action, Result — the standard structure for competency questions, used widely by employers including the UK Civil Service and the NHS. Set the scene, state what you personally were responsible for, describe the specific actions you took, and finish with the outcome. Interviewers score Action and Result most heavily. STAR is the wrong shape for questions like 'Why do you want to work here?' or 'What is your greatest weakness?', so this builder deliberately does not use it there — you will get a motivation or reflective structure instead.",
  },
  {
    question: "Which question types does it cover?",
    answer:
      "Thirty-five categories, including tell me about yourself, why this job, why this company, why should we hire you, strengths, weaknesses, challenges, conflict, failure, success, leadership, teamwork, communication, problem solving, technical challenges, working under pressure, deadlines, prioritisation, ambiguity, stakeholder and customer situations, learning quickly, initiative, innovation, adaptability, handling feedback, career goals, motivation, values and culture fit, plus graduate, internship, technical and management specific questions. The question you type is classified automatically, and you can override the structure if you disagree.",
  },
  {
    question: "Why does it ask for the job description?",
    answer:
      "So the draft can use the employer's own vocabulary rather than generic filler. Pasting the advert lets the builder pick up the industry and the skills the employer actually named, which changes which sentence patterns are eligible. It is optional, it is read only in your browser, and it is never uploaded or stored.",
  },
  {
    question: "How long should a written application answer be?",
    answer:
      "Follow the form's stated limit. Application forms commonly allow 150 to 300 words per question, and UK Civil Service behaviour statements are typically capped at 250 words. If no limit is given, around 200 words with one strong specific example beats a longer, vaguer answer. The Short, Standard and Detailed settings target roughly 60–110, 120–200 and 200–300 words.",
  },
  {
    question: "Is anything I type uploaded or saved?",
    answer:
      "No. The whole tool runs in your browser with no account and no server: your question, notes, job description and drafts are never uploaded, stored or logged. The only thing kept locally is a short list of which sentence patterns were used recently, so repeat builds do not repeat themselves — no personal text is in it, and it clears when you close the tab.",
  },
];

export default function JobAnswerPage() {
  return (
    <ToolLayout
      tool={getTool("job-answer")!}
      explanation={
        <>
          <h3>What the Answer Builder actually does</h3>
          <p>
            It is a structured drafting tool, not an AI writer, and it does not
            call one. Type the question and a few plain sentences about a real
            example. The builder classifies the question against thirty-five
            question types, works out the industry, seniority and relevant
            skills from the job title and advert, then assembles a draft from a
            large tagged library of human-written sentence patterns — weaving
            your own sentences into every part of the answer that states a fact.
          </p>
          <p>
            Wherever your notes leave a gap, the draft shows a bracketed prompt
            asking for your own detail rather than inventing anything. That is a
            deliberate design constraint: the pattern library contains no
            numbers, no team sizes and no achievements, so the only claims about
            you in a finished answer are the ones you made yourself.
          </p>
          <h3>What you get back</h3>
          <ul>
            <li>
              <strong>Three drafts</strong> — a best answer, a more concise
              version for tight word limits, and an alternative angle that
              reframes the same material. Each is copied independently.
            </li>
            <li>
              <strong>A STAR breakdown</strong> — Situation, Task, Action,
              Result, shown only when the question genuinely suits it.
            </li>
            <li>
              <strong>What would make it stronger</strong> — a specific list of
              the detail still missing, with the kinds of measurable outcome
              that carry weight in your industry.
            </li>
            <li>
              <strong>Your own facts, listed back</strong> — so you can see
              exactly which sentences came from you.
            </li>
          </ul>
          <h3>Choosing a structure</h3>
          <ul>
            <li>
              <strong>STAR</strong> and <strong>CAR</strong> — competency and
              behavioural questions: &ldquo;tell me about a time you&hellip;&rdquo;.
            </li>
            <li>
              <strong>Motivation</strong> — company, role, fit: &ldquo;why do
              you want to work here?&rdquo;. STAR is never forced onto these.
            </li>
            <li>
              <strong>Direct</strong> — claim, evidence, relevance: strengths,
              &ldquo;why should we hire you?&rdquo;, and small form boxes.
            </li>
            <li>
              <strong>Technical</strong> — context, approach, trade-offs,
              outcome: how you built, fixed or would design something.
            </li>
            <li>
              <strong>Reflective</strong> — issue, correction, evidence of
              change: weaknesses, failures and feedback questions.
            </li>
          </ul>
          <h3>How to get a good draft out of it</h3>
          <ul>
            <li>
              Write two to five short factual sentences in chronological order:
              the first sets the scene, the last states the outcome.
            </li>
            <li>
              Include at least one real number — a percentage, a deadline, a
              team size, money saved. The builder will place it in the Result,
              where it does the most work, and will ask for one if you have not
              given one.
            </li>
            <li>
              Paste the job advert. It costs you nothing, stays in your browser,
              and noticeably changes the vocabulary the draft reaches for.
            </li>
            <li>
              Press <strong>Another version</strong> a few times and take the
              phrasing you like best, then rewrite it until it sounds like you.
            </li>
          </ul>
          <h3>Privacy</h3>
          <p>
            No account, no server, no uploads. Your question, notes, CV-style
            detail and drafts stay on your device, which is the whole point of
            drafting career material here rather than in a chatbot.
          </p>
        </>
      }
      faqs={FAQS}
      disclaimer={
        <>
          Drafts are composed from sentence patterns plus the notes you type —
          they are a starting point, not a finished answer, and this tool does
          not use an AI model. Every bracketed prompt marks detail only you can
          supply. Always personalise, fact-check and rewrite in your own words
          before submitting, and never claim a result you did not achieve. This
          is general drafting help, not careers advice, and nothing you type
          leaves your browser.
        </>
      }
    >
      <JobAnswerTool />
    </ToolLayout>
  );
}
