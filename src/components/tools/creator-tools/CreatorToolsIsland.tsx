"use client";

import { useMemo, useRef, useState } from "react";

import {
  Button,
  CheckboxInput,
  CopyButton,
  SelectInput,
  TextAreaInput,
  TextInput,
} from "@/components/ui";
import {
  buildDescriptionSkeleton,
  generateHooks,
  generateTitles,
  organiseKeywords,
  type HookCategory,
  type TitleTone,
} from "@/lib/creator/creatorTools";

const TABS = [
  { id: "titles", label: "Titles" },
  { id: "hooks", label: "Hooks" },
  { id: "description", label: "Description" },
  { id: "keywords", label: "Keywords" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TONE_OPTIONS: { value: TitleTone; label: string }[] = [
  { value: "how-to", label: "How-to / guide" },
  { value: "listicle", label: "Listicle" },
  { value: "story", label: "Story / personal" },
  { value: "bold", label: "Bold / contrarian" },
];

const HOOK_OPTIONS: { value: HookCategory; label: string }[] = [
  { value: "educational", label: "Educational" },
  { value: "story", label: "Story" },
  { value: "contrarian", label: "Contrarian" },
  { value: "question", label: "Question" },
];

function ResultsList({
  items,
  copyAllLabel = "Copy all",
}: {
  items: string[];
  copyAllLabel?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div aria-live="polite" className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-muted">
          {items.length} result{items.length === 1 ? "" : "s"}
        </h3>
        <CopyButton text={items.join("\n")} label={copyAllLabel} />
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li
            key={index}
            className="flex items-center justify-between gap-3 rounded-field border border-border bg-surface px-4 py-3"
          >
            <span className="text-base leading-relaxed text-foreground">
              {item}
            </span>
            <CopyButton text={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyPrompt({ children }: { children: string }) {
  return <p className="mt-6 text-sm text-muted">{children}</p>;
}

export function CreatorToolsIsland() {
  const [activeTab, setActiveTab] = useState<TabId>("titles");
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});

  // Titles
  const [titleSubject, setTitleSubject] = useState("");
  const [tone, setTone] = useState<TitleTone>("how-to");
  const [audience, setAudience] = useState("");

  // Hooks
  const [hookSubject, setHookSubject] = useState("");
  const [hookCategory, setHookCategory] = useState<HookCategory>("educational");

  // Description
  const [descSubject, setDescSubject] = useState("");
  const [includeLinks, setIncludeLinks] = useState(true);
  const [includeChapters, setIncludeChapters] = useState(true);

  // Keywords
  const [rawKeywords, setRawKeywords] = useState("");

  const titles = useMemo(
    () =>
      generateTitles({
        subject: titleSubject,
        tone,
        audience: audience.trim() === "" ? undefined : audience,
      }),
    [titleSubject, tone, audience]
  );

  const hooks = useMemo(
    () => generateHooks(hookSubject, hookCategory),
    [hookSubject, hookCategory]
  );

  const skeleton = useMemo(
    () =>
      buildDescriptionSkeleton({
        subject: descSubject,
        links: includeLinks,
        chapters: includeChapters,
      }),
    [descSubject, includeLinks, includeChapters]
  );

  const organised = useMemo(() => organiseKeywords(rawKeywords), [rawKeywords]);

  function onTabKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const currentIndex = TABS.findIndex((t) => t.id === activeTab);
    let nextIndex = -1;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % TABS.length;
    if (event.key === "ArrowLeft")
      nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = TABS.length - 1;
    if (nextIndex >= 0) {
      event.preventDefault();
      const nextId = TABS[nextIndex].id;
      setActiveTab(nextId);
      tabRefs.current[nextId]?.focus();
    }
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
      <p className="mb-5 inline-flex items-center gap-2 rounded-field bg-accent-soft px-3 py-2 text-sm text-accent-emphasis">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="size-4 shrink-0"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        Template-based helpers — not AI. Everything runs in your browser.
      </p>

      <div
        role="tablist"
        aria-label="Creator tools"
        onKeyDown={onTabKeyDown}
        className="flex flex-wrap gap-1 rounded-field bg-surface-subtle p-1"
      >
        {TABS.map((tab) => {
          const selected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={[
                "h-11 flex-1 rounded-field px-3 text-sm font-medium transition-colors sm:px-4",
                selected
                  ? "bg-surface text-accent shadow-card"
                  : "text-muted hover:text-foreground",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Titles */}
      <div
        role="tabpanel"
        id="panel-titles"
        aria-labelledby="tab-titles"
        hidden={activeTab !== "titles"}
        className="mt-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            id="title-subject"
            label="Topic or subject"
            value={titleSubject}
            onChange={setTitleSubject}
            placeholder="e.g. sourdough baking"
            hint="What is the video or post about?"
            maxLength={120}
          />
          <SelectInput
            id="title-tone"
            label="Tone"
            value={tone}
            onChange={(v) => setTone(v as TitleTone)}
            options={TONE_OPTIONS}
          />
        </div>
        <div className="mt-4">
          <TextInput
            id="title-audience"
            label="Audience (optional)"
            value={audience}
            onChange={setAudience}
            placeholder="e.g. beginners, students, small business owners"
            hint="Some patterns weave the audience into the title."
            maxLength={80}
          />
        </div>
        {titles.length > 0 ? (
          <ResultsList items={titles} copyAllLabel="Copy all titles" />
        ) : (
          <EmptyPrompt>
            Enter a topic above and title variations will appear instantly.
          </EmptyPrompt>
        )}
      </div>

      {/* Hooks */}
      <div
        role="tabpanel"
        id="panel-hooks"
        aria-labelledby="tab-hooks"
        hidden={activeTab !== "hooks"}
        className="mt-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            id="hook-subject"
            label="Topic or subject"
            value={hookSubject}
            onChange={setHookSubject}
            placeholder="e.g. day trading"
            hint="The subject slotted into each opening line."
            maxLength={120}
          />
          <SelectInput
            id="hook-category"
            label="Hook style"
            value={hookCategory}
            onChange={(v) => setHookCategory(v as HookCategory)}
            options={HOOK_OPTIONS}
          />
        </div>
        {hooks.length > 0 ? (
          <ResultsList items={hooks} copyAllLabel="Copy all hooks" />
        ) : (
          <EmptyPrompt>
            Enter a topic above and opening-line ideas will appear instantly.
          </EmptyPrompt>
        )}
      </div>

      {/* Description */}
      <div
        role="tabpanel"
        id="panel-description"
        aria-labelledby="tab-description"
        hidden={activeTab !== "description"}
        className="mt-6"
      >
        <TextInput
          id="desc-subject"
          label="Video topic"
          value={descSubject}
          onChange={setDescSubject}
          placeholder="e.g. home coffee brewing"
          hint="Used in the hook line, bullets and hashtags."
          maxLength={120}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <CheckboxInput
            id="desc-chapters"
            label="Include chapters placeholder"
            checked={includeChapters}
            onChange={setIncludeChapters}
            hint="Timestamp lines you can fill in after editing."
          />
          <CheckboxInput
            id="desc-links"
            label="Include links block"
            checked={includeLinks}
            onChange={setIncludeLinks}
            hint="Placeholders for resources and your own links."
          />
        </div>
        {skeleton !== "" ? (
          <div aria-live="polite" className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-muted">
                Description skeleton
              </h3>
              <CopyButton text={skeleton} label="Copy description" />
            </div>
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-field border border-border bg-surface-subtle px-4 py-3 font-sans text-sm leading-relaxed text-foreground">
              {skeleton}
            </pre>
            <p className="mt-2 text-xs text-faint">
              Everything in [square brackets] is a placeholder for you to
              replace.
            </p>
          </div>
        ) : (
          <EmptyPrompt>
            Enter a topic above to build a description skeleton.
          </EmptyPrompt>
        )}
      </div>

      {/* Keywords */}
      <div
        role="tabpanel"
        id="panel-keywords"
        aria-labelledby="tab-keywords"
        hidden={activeTab !== "keywords"}
        className="mt-6"
      >
        <TextAreaInput
          id="keywords-raw"
          label="Keywords and hashtags"
          value={rawKeywords}
          onChange={setRawKeywords}
          rows={6}
          placeholder={"baking, #Sourdough\nbread recipes, #starter"}
          hint="Paste phrases separated by commas or new lines. Entries starting with # are treated as hashtags."
        />
        {rawKeywords.trim() !== "" && (
          <div className="mt-3">
            <Button variant="ghost" onClick={() => setRawKeywords("")}>
              Clear
            </Button>
          </div>
        )}
        {organised.total > 0 ? (
          <div aria-live="polite" className="mt-6 space-y-6">
            <p className="text-sm text-muted">
              {organised.total} unique{" "}
              {organised.total === 1 ? "entry" : "entries"}
              {organised.duplicatesRemoved > 0
                ? ` — ${organised.duplicatesRemoved} duplicate${
                    organised.duplicatesRemoved === 1 ? "" : "s"
                  } removed`
                : ""}
              .
            </p>
            {organised.hashtags.length > 0 && (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-muted">
                    Hashtags ({organised.hashtagCount})
                  </h3>
                  <CopyButton
                    text={organised.hashtags.join(" ")}
                    label="Copy hashtags"
                  />
                </div>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {organised.hashtags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-field bg-accent-soft px-3 py-1.5 text-sm text-accent-emphasis"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {organised.keywords.length > 0 && (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-muted">
                    Keywords ({organised.keywordCount})
                  </h3>
                  <CopyButton
                    text={organised.keywords.join(", ")}
                    label="Copy keywords"
                  />
                </div>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {organised.keywords.map((keyword) => (
                    <li
                      key={keyword}
                      className="rounded-field border border-border bg-surface-subtle px-3 py-1.5 text-sm text-foreground"
                    >
                      {keyword}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <EmptyPrompt>
            Paste keywords or hashtags above to tidy, dedupe and group them.
          </EmptyPrompt>
        )}
      </div>
    </div>
  );
}
