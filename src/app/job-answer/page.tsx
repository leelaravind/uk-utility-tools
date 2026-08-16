import type { Metadata } from "next";

import { ToolLayout } from "@/components/ui";
import { getTool } from "@/lib/registry";
import { JobAnswerTool } from "@/components/tools/job-answer/JobAnswerTool";

export const metadata: Metadata = {
  title: "Job Application Answer Helper — STAR Method Answer Builder",
  description:
    "Build structured answers to job application and interview questions with STAR, technical, concise and motivation frameworks. Templates, not AI — nothing is uploaded.",
  alternates: { canonical: "/job-answer" },
};

const FAQS = [
  {
    question: "Is this tool AI?",
    answer:
      "No — and it says so on the tin. It composes deterministic sentence scaffolds from proven answer frameworks and slots your own notes into them. The same inputs always produce the same draft, nothing is generated or invented on your behalf, and nothing you type leaves your browser.",
  },
  {
    question: "Can I submit the draft exactly as it comes out?",
    answer:
      "Please don't. The draft is a scaffold: every [Add specifics] placeholder marks detail only you can supply, and recruiters quickly spot template phrasing that hasn't been personalised. Rewrite it in your own voice, add real names, numbers and outcomes, then check it against any word limit on the form.",
  },
  {
    question: "What is the STAR method?",
    answer:
      "STAR stands for Situation, Task, Action, Result — the standard structure for competency questions used across UK employers, including the Civil Service and the NHS. You set the scene, state what you personally were responsible for, describe the specific actions you took, and finish with a measurable outcome. Interviewers score the Action and Result parts most heavily.",
  },
  {
    question: "Which framework should I pick for which question?",
    answer:
      "'Tell me about a time…' competency questions suit STAR. 'How would you build/design…' questions suit the technical structure (context, approach, trade-offs, outcome). 'Why do you want to work here?' suits the motivation structure (company, role, fit). Short application-form boxes and strengths questions suit the concise three-sentence answer. The tool suggests a framework automatically from the wording of your question.",
  },
  {
    question: "Is anything I type uploaded or saved?",
    answer:
      "No. The whole tool runs in your browser with no account and no server — your question, notes and drafts are never uploaded, stored or logged, and they disappear when you close the page (so copy your draft out before you leave).",
  },
  {
    question: "How long should a written application answer be?",
    answer:
      "Follow the form's stated limit — UK application forms commonly allow 150 to 300 words per question, and Civil Service behaviour statements are typically capped at 250 words. If no limit is given, roughly 200 words with one strong specific example usually beats a longer, vaguer answer.",
  },
];

export default function JobAnswerPage() {
  return (
    <ToolLayout
      tool={getTool("job-answer")!}
      explanation={
        <>
          <h3>What this helper actually does</h3>
          <p>
            It is an honest template engine, not an AI writer. You type the
            question and a few plain sentences about a real example; the tool
            detects what kind of question it is, suggests a framework, and slots
            your sentences into that framework&rsquo;s structure with connecting
            phrases in your chosen tone. Wherever your notes leave a gap, the
            draft shows a bracketed <strong>[Add specifics]</strong> placeholder
            instead of inventing anything — so the facts in the final answer are
            always yours.
          </p>
          <h3>The four frameworks</h3>
          <ul>
            <li>
              <strong>STAR</strong> — Situation, Task, Action, Result: the
              default for &ldquo;tell me about a time&hellip;&rdquo; competency
              and behavioural questions.
            </li>
            <li>
              <strong>Technical</strong> — context, approach, trade-offs,
              outcome: for questions about how you built, fixed or would design
              something.
            </li>
            <li>
              <strong>Concise</strong> — a disciplined three-sentence answer
              (direct answer, evidence, relevance): for strengths questions and
              small application-form boxes.
            </li>
            <li>
              <strong>Motivation</strong> — company, role, fit: for &ldquo;why
              us / why this role&rdquo; questions.
            </li>
          </ul>
          <h3>How to get a good draft out of it</h3>
          <ul>
            <li>
              Write your notes as two to five short factual sentences in
              chronological order — first sentence sets the scene, last one
              states the outcome.
            </li>
            <li>
              Include at least one number: a percentage, a deadline, a team
              size, money saved. Results with figures score better everywhere.
            </li>
            <li>
              Pick the tone that matches the employer — professional for
              formal applications, friendly for customer-facing roles,
              confident for sales-style pitches — then edit until it sounds
              like you.
            </li>
            <li>
              Replace every placeholder before submitting. The brackets exist
              precisely so an unfinished draft cannot masquerade as a finished
              answer.
            </li>
          </ul>
          <h3>Privacy</h3>
          <p>
            No account, no server, no storage: the tool works entirely in your
            browser and your notes never leave your device.
          </p>
        </>
      }
      faqs={FAQS}
      disclaimer={
        <>
          Drafts are deterministic template scaffolds built only from the notes
          you type — they are a starting point, not a finished answer. Always
          personalise, fact-check and rewrite in your own words before
          submitting; never submit an unedited draft. This is general drafting
          help, not careers advice, and nothing you type leaves your browser.
        </>
      }
    >
      <JobAnswerTool />
    </ToolLayout>
  );
}
