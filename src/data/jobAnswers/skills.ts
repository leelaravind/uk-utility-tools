/**
 * Skill vocabulary.
 *
 * Drives the "skills this advert asks for" list. Every `signals` entry is
 * matched as a plain lowercase substring against a pasted job description, so
 * a skill is detected when any one of its signals appears anywhere in the text.
 * The detected skills then feed the composer, which only ever uses a skill the
 * visitor has confirmed is genuinely theirs.
 *
 * ADDING AN ENTRY.
 *  - `id` is stable kebab-case; `label` is how it is displayed, capitalised the
 *    way the industry writes it ("Power BI", "SQL", "Stakeholder management").
 *  - `signals` are lowercase and must be long enough not to appear inside an
 *    unrelated word. Substring matching has no word boundaries, and English is
 *    full of traps: "excel" hides in "excellent", "git" in "digital", "aws" in
 *    "laws", "java" in "javascript", "sage" in "message", "cad" in "decade",
 *    "vat" in "innovative", "sla" in "translate", "sen" in "essential" and
 *    "apis" in "therapist". Where the bare word is unsafe, use the phrase it
 *    actually appears in ("microsoft excel", "version control", "vat returns").
 *  - `industries` is optional and narrows where the skill is suggested; leave
 *    it off for anything genuinely cross-sector.
 *  - British English. No real product claims beyond the tool's own name.
 */

import type { SkillDefinition } from "./types";

export const SKILL_DEFINITIONS: SkillDefinition[] = [
  /* ---------------------------------------------------------------- */
  /* Programming and engineering tools                                */
  /* ---------------------------------------------------------------- */
  {
    id: "python",
    label: "Python",
    signals: ["python", "pandas", "numpy", "django", "flask"],
    industries: ["technology", "science", "finance"],
  },
  {
    id: "sql",
    label: "SQL",
    signals: ["sql", "stored procedure", "relational database", "postgres", "database queries"],
    industries: ["technology", "finance", "public-sector"],
  },
  {
    id: "r-programming",
    label: "R",
    signals: ["r programming", "rstudio", "programming in r", "r scripts", "statistical programming"],
    industries: ["science", "finance", "healthcare"],
  },
  {
    id: "matlab",
    label: "MATLAB",
    signals: ["matlab", "simulink"],
    industries: ["engineering", "science"],
  },
  {
    id: "java",
    label: "Java",
    signals: ["core java", "java developer", "java se", "spring boot", "jvm", "java 17"],
    industries: ["technology"],
  },
  {
    id: "c-sharp",
    label: "C#",
    signals: ["c#", "c sharp", ".net", "dotnet", "asp.net"],
    industries: ["technology"],
  },
  {
    id: "javascript",
    label: "JavaScript",
    signals: ["javascript", "es6", "ecmascript", "vanilla js"],
    industries: ["technology", "creative"],
  },
  {
    id: "typescript",
    label: "TypeScript",
    signals: ["typescript"],
    industries: ["technology"],
  },
  {
    id: "react",
    label: "React",
    signals: ["reactjs", "react.js", "react native", "react components", "react developer"],
    industries: ["technology"],
  },
  {
    id: "node-js",
    label: "Node.js",
    signals: ["node.js", "nodejs", "node js", "express.js"],
    industries: ["technology"],
  },
  {
    id: "html-css",
    label: "HTML and CSS",
    signals: ["html", "css", "sass", "responsive design", "tailwind"],
    industries: ["technology", "creative"],
  },
  {
    id: "version-control",
    label: "Version control (Git)",
    signals: ["version control", "github", "gitlab", "bitbucket", "pull request", "branching strategy"],
    industries: ["technology"],
  },
  {
    id: "docker",
    label: "Docker",
    signals: ["docker", "containerisation", "containerization", "container image"],
    industries: ["technology"],
  },
  {
    id: "kubernetes",
    label: "Kubernetes",
    signals: ["kubernetes", "k8s", "container orchestration", "helm chart"],
    industries: ["technology"],
  },
  {
    id: "linux",
    label: "Linux",
    signals: ["linux", "ubuntu", "bash scripting", "shell scripting", "unix"],
    industries: ["technology"],
  },
  {
    id: "aws",
    label: "AWS",
    signals: ["amazon web services", "aws cloud", "aws services", "aws lambda", "cloudformation", "aws certified"],
    industries: ["technology"],
  },
  {
    id: "azure",
    label: "Microsoft Azure",
    signals: ["azure", "microsoft cloud", "azure devops"],
    industries: ["technology"],
  },
  {
    id: "ci-cd",
    label: "CI/CD",
    signals: ["ci/cd", "continuous integration", "continuous delivery", "build pipeline", "deployment pipeline"],
    industries: ["technology"],
  },
  {
    id: "rest-apis",
    label: "REST APIs",
    signals: ["rest api", "restful", "api integration", "api design", "web services", "json payload"],
    industries: ["technology"],
  },
  {
    id: "machine-learning",
    label: "Machine learning",
    signals: ["machine learning", "predictive model", "neural network", "model training", "deep learning"],
    industries: ["technology", "science"],
  },
  {
    id: "automated-testing",
    label: "Automated testing",
    signals: ["test automation", "automated testing", "unit testing", "selenium", "cypress", "regression testing"],
    industries: ["technology"],
  },
  {
    id: "networking",
    label: "Networking",
    signals: ["tcp/ip", "network configuration", "firewall", "vpn", "cisco", "routing and switching"],
    industries: ["technology"],
  },

  /* ---------------------------------------------------------------- */
  /* Business software and platforms                                  */
  /* ---------------------------------------------------------------- */
  {
    id: "excel",
    label: "Microsoft Excel",
    signals: [
      "microsoft excel",
      "ms excel",
      "advanced excel",
      "excel spreadsheet",
      "spreadsheets",
      "pivot table",
      "vlookup",
      "xlookup",
    ],
  },
  {
    id: "microsoft-office",
    label: "Microsoft Office",
    signals: ["microsoft office", "ms office", "microsoft word", "powerpoint", "outlook", "office 365"],
  },
  {
    id: "power-bi",
    label: "Power BI",
    signals: ["power bi", "powerbi", "dax", "power query"],
    industries: ["technology", "finance", "public-sector"],
  },
  {
    id: "tableau",
    label: "Tableau",
    signals: ["tableau"],
    industries: ["technology", "finance"],
  },
  {
    id: "data-visualisation",
    label: "Data visualisation",
    signals: ["data visualisation", "data visualization", "dashboards", "management reporting pack", "charts and graphs"],
  },
  {
    id: "sap",
    label: "SAP",
    signals: ["sap", "erp system", "s/4hana"],
    industries: ["manufacturing", "logistics", "finance"],
  },
  {
    id: "salesforce",
    label: "Salesforce",
    signals: ["salesforce", "sales cloud", "service cloud"],
    industries: ["sales", "customer-service", "technology"],
  },
  {
    id: "crm-systems",
    label: "CRM systems",
    signals: ["crm", "customer relationship management", "pipeline management tool", "hubspot", "dynamics 365"],
    industries: ["sales", "customer-service"],
  },
  {
    id: "sage-accounting",
    label: "Sage",
    signals: ["sage 50", "sage accounting", "sage payroll", "sage line 50"],
    industries: ["finance"],
  },
  {
    id: "xero-quickbooks",
    label: "Xero and QuickBooks",
    signals: ["xero", "quickbooks", "cloud accounting software"],
    industries: ["finance"],
  },
  {
    id: "jira",
    label: "Jira",
    signals: ["jira", "confluence", "azure boards", "ticketing system"],
    industries: ["technology"],
  },
  {
    id: "autocad",
    label: "AutoCAD",
    signals: ["autocad", "cad drawings", "cad software", "2d cad", "3d cad", "technical drawings"],
    industries: ["engineering", "construction"],
  },
  {
    id: "solidworks",
    label: "SolidWorks",
    signals: ["solidworks", "3d modelling", "parametric modelling", "inventor"],
    industries: ["engineering", "manufacturing"],
  },
  {
    id: "revit",
    label: "Revit and BIM",
    signals: ["revit", "building information modelling", "bim level 2", "navisworks"],
    industries: ["construction", "engineering"],
  },
  {
    id: "figma",
    label: "Figma",
    signals: ["figma", "wireframe", "prototyping tool", "design system"],
    industries: ["technology", "creative"],
  },
  {
    id: "adobe-creative-cloud",
    label: "Adobe Creative Cloud",
    signals: ["adobe", "photoshop", "illustrator", "indesign", "premiere pro", "after effects"],
    industries: ["creative"],
  },
  {
    id: "wordpress",
    label: "WordPress",
    signals: ["wordpress", "content management system", "cms"],
    industries: ["creative", "technology"],
  },
  {
    id: "google-analytics",
    label: "Google Analytics",
    signals: ["google analytics", "web analytics", "ga4", "tag manager"],
    industries: ["creative", "sales"],
  },
  {
    id: "seo",
    label: "SEO",
    signals: ["seo", "search engine optimisation", "search engine optimization", "organic search", "keyword research"],
    industries: ["creative", "sales"],
  },
  {
    id: "epos-systems",
    label: "EPOS and till systems",
    signals: ["epos", "till system", "point of sale", "cash handling"],
    industries: ["retail", "hospitality"],
  },

  /* ---------------------------------------------------------------- */
  /* Finance and commercial domain                                    */
  /* ---------------------------------------------------------------- */
  {
    id: "financial-reporting",
    label: "Financial reporting",
    signals: ["financial reporting", "statutory accounts", "month end close", "year end accounts", "balance sheet"],
    industries: ["finance"],
  },
  {
    id: "management-accounting",
    label: "Management accounting",
    signals: ["management accounts", "variance analysis", "cost centre", "accruals and prepayments"],
    industries: ["finance"],
  },
  {
    id: "financial-modelling",
    label: "Financial modelling",
    signals: ["financial modelling", "financial modeling", "cash flow forecast", "scenario analysis", "business case modelling"],
    industries: ["finance"],
  },
  {
    id: "budgeting",
    label: "Budgeting",
    signals: ["budgeting", "budget management", "budget holder", "budgetary control", "forecasting"],
  },
  {
    id: "payroll",
    label: "Payroll",
    signals: ["payroll", "paye", "rti submission", "statutory sick pay", "pension auto enrolment"],
    industries: ["finance"],
  },
  {
    id: "vat-and-tax",
    label: "VAT and tax",
    signals: ["vat returns", "vat compliance", "corporation tax", "tax returns", "hmrc submissions", "making tax digital"],
    industries: ["finance"],
  },
  {
    id: "auditing",
    label: "Auditing",
    signals: ["auditing", "audit fieldwork", "internal audit", "audit evidence", "control testing"],
    industries: ["finance"],
  },
  {
    id: "risk-management",
    label: "Risk management",
    signals: ["risk management", "risk register", "risk assessment framework", "risk appetite", "mitigation plan"],
  },
  {
    id: "regulatory-compliance",
    label: "Regulatory compliance",
    signals: ["regulatory compliance", "fca rules", "anti money laundering", "know your customer", "compliance monitoring"],
    industries: ["finance", "legal"],
  },
  {
    id: "procurement",
    label: "Procurement",
    signals: ["procurement", "tendering", "supplier selection", "purchase orders", "contract award", "sourcing"],
    industries: ["public-sector", "logistics", "manufacturing"],
  },
  {
    id: "inventory-management",
    label: "Inventory management",
    signals: ["inventory management", "stock control", "stock takes", "replenishment", "goods received"],
    industries: ["retail", "logistics", "manufacturing"],
  },
  {
    id: "supply-chain-planning",
    label: "Supply chain planning",
    signals: ["supply chain planning", "demand planning", "route optimisation", "capacity planning", "logistics planning"],
    industries: ["logistics", "manufacturing"],
  },

  /* ---------------------------------------------------------------- */
  /* Regulated and sector domain knowledge                            */
  /* ---------------------------------------------------------------- */
  {
    id: "gdpr",
    label: "GDPR and data protection",
    signals: ["gdpr", "data protection", "information governance", "subject access request", "confidentiality policy"],
  },
  {
    id: "safeguarding",
    label: "Safeguarding",
    signals: ["safeguarding", "child protection", "dbs check", "prevent duty", "vulnerable adults"],
    industries: ["education", "healthcare", "nonprofit"],
  },
  {
    id: "infection-control",
    label: "Infection control",
    signals: ["infection control", "infection prevention", "hand hygiene", "personal protective equipment", "clinical waste"],
    industries: ["healthcare"],
  },
  {
    id: "medication-administration",
    label: "Medication administration",
    signals: ["medication administration", "administering medication", "mar chart", "controlled drugs", "dispensing"],
    industries: ["healthcare"],
  },
  {
    id: "care-planning",
    label: "Care planning",
    signals: ["care planning", "care plans", "person centred care", "risk assessments for service users", "keyworking"],
    industries: ["healthcare", "nonprofit"],
  },
  {
    id: "health-and-safety",
    label: "Health and safety",
    signals: ["health and safety", "coshh", "risk assessments", "iosh", "nebosh", "method statement", "manual handling"],
    industries: ["construction", "manufacturing", "logistics"],
  },
  {
    id: "food-hygiene",
    label: "Food hygiene",
    signals: ["food hygiene", "food safety", "haccp", "allergen awareness", "level 2 food"],
    industries: ["hospitality", "retail"],
  },
  {
    id: "curriculum-planning",
    label: "Curriculum planning",
    signals: ["curriculum planning", "schemes of work", "lesson planning", "national curriculum", "assessment for learning"],
    industries: ["education"],
  },
  {
    id: "classroom-management",
    label: "Classroom management",
    signals: ["classroom management", "behaviour management", "behaviour policy", "pastoral support"],
    industries: ["education"],
  },
  {
    id: "special-educational-needs",
    label: "Special educational needs",
    signals: ["special educational needs", "send provision", "education health and care plan", "sen support", "additional needs"],
    industries: ["education", "healthcare"],
  },
  {
    id: "contract-law",
    label: "Contract law",
    signals: ["contract law", "contract drafting", "commercial contracts", "terms and conditions review", "contract negotiation"],
    industries: ["legal"],
  },
  {
    id: "legal-research",
    label: "Legal research",
    signals: ["legal research", "case law", "precedent", "bundle preparation", "disclosure exercise"],
    industries: ["legal"],
  },
  {
    id: "bid-writing",
    label: "Bid and tender writing",
    signals: ["bid writing", "tender writing", "tender submission", "pqq", "itt response", "proposal writing"],
    industries: ["public-sector", "construction", "nonprofit"],
  },
  {
    id: "fundraising",
    label: "Fundraising",
    signals: ["fundraising", "grant applications", "donor stewardship", "trusts and foundations", "community fundraising"],
    industries: ["nonprofit"],
  },
  {
    id: "lean-six-sigma",
    label: "Lean and Six Sigma",
    signals: ["lean manufacturing", "lean six sigma", "six sigma", "kaizen", "value stream mapping", "root cause analysis"],
    industries: ["manufacturing", "logistics"],
  },
  {
    id: "quality-assurance",
    label: "Quality assurance",
    signals: ["quality assurance", "quality control", "iso 9001", "quality standards", "inspection process", "non-conformance"],
    industries: ["manufacturing", "engineering", "science"],
  },
  {
    id: "recruitment",
    label: "Recruitment",
    signals: ["recruitment", "shortlisting", "interviewing candidates", "onboarding", "talent acquisition"],
  },
  {
    id: "employee-relations",
    label: "Employee relations",
    signals: ["employee relations", "disciplinary", "grievance", "absence management", "performance management process"],
  },
  {
    id: "complaint-handling",
    label: "Complaint handling",
    signals: ["complaint handling", "complaints resolution", "escalations", "service recovery", "de-escalation"],
    industries: ["customer-service", "retail", "public-sector"],
  },

  /* ---------------------------------------------------------------- */
  /* Transferable skills                                              */
  /* ---------------------------------------------------------------- */
  {
    id: "communication",
    label: "Communication",
    signals: ["communication skills", "written and verbal", "communicate effectively", "clear communicator"],
  },
  {
    id: "stakeholder-management",
    label: "Stakeholder management",
    signals: ["stakeholder management", "stakeholder engagement", "stakeholders at all levels", "building relationships", "influencing skills"],
  },
  {
    id: "prioritisation",
    label: "Prioritisation",
    signals: ["prioritise", "prioritisation", "prioritize", "competing priorities", "manage a varied workload"],
  },
  {
    id: "time-management",
    label: "Time management",
    signals: ["time management", "manage your own time", "meet deadlines", "work to deadlines", "self-manage"],
  },
  {
    id: "problem-solving",
    label: "Problem solving",
    signals: ["problem solving", "problem-solving", "solutions focused", "analytical approach", "troubleshooting"],
  },
  {
    id: "attention-to-detail",
    label: "Attention to detail",
    signals: ["attention to detail", "accuracy", "meticulous", "detail oriented", "high level of accuracy"],
  },
  {
    id: "data-analysis",
    label: "Data analysis",
    signals: ["data analysis", "analysing data", "interpreting data", "trend analysis", "statistical analysis"],
  },
  {
    id: "report-writing",
    label: "Report writing",
    signals: ["report writing", "writing reports", "written reports", "producing reports", "documentation skills"],
  },
  {
    id: "presenting",
    label: "Presenting",
    signals: ["presentation skills", "presenting to", "public speaking", "delivering presentations", "facilitating workshops"],
  },
  {
    id: "customer-service",
    label: "Customer service",
    signals: ["customer service", "customer focused", "customer facing", "serving customers", "customer experience"],
  },
  {
    id: "teamwork",
    label: "Teamwork",
    signals: ["teamwork", "team player", "work as part of a team", "collaborative working", "cross-functional working"],
  },
  {
    id: "leadership",
    label: "Leadership",
    signals: ["leadership", "line management", "leading a team", "supervising staff", "motivating a team"],
  },
  {
    id: "mentoring",
    label: "Mentoring",
    signals: ["mentoring", "mentor junior", "supporting new starters", "buddy system", "peer support"],
  },
  {
    id: "coaching",
    label: "Coaching",
    signals: ["coaching", "developing others", "one to one coaching", "performance coaching"],
  },
  {
    id: "training-delivery",
    label: "Training delivery",
    signals: ["deliver training", "training delivery", "staff training", "train new starters", "deliver inductions", "training sessions"],
  },
  {
    id: "negotiation",
    label: "Negotiation",
    signals: ["negotiation", "negotiating", "negotiate contracts", "commercial negotiation"],
  },
  {
    id: "conflict-resolution",
    label: "Conflict resolution",
    signals: ["conflict resolution", "resolving conflict", "mediation", "managing disagreements", "de-escalating"],
  },
  {
    id: "adaptability",
    label: "Adaptability",
    signals: ["adaptability", "adaptable", "flexible approach", "comfortable with change", "thrive in a changing"],
  },
  {
    id: "resilience",
    label: "Resilience",
    signals: ["resilience", "resilient", "work under pressure", "calm under pressure", "fast paced environment"],
  },
  {
    id: "organisational-skills",
    label: "Organisational skills",
    signals: ["organisational skills", "organizational skills", "highly organised", "well organised", "methodical"],
  },
  {
    id: "process-improvement",
    label: "Process improvement",
    signals: ["process improvement", "continuous improvement", "streamline processes", "improving ways of working", "efficiency savings"],
  },
  {
    id: "project-planning",
    label: "Project planning",
    signals: ["project planning", "project plans", "gantt", "milestone tracking", "prince2", "agile delivery"],
  },
  {
    id: "decision-making",
    label: "Decision making",
    signals: ["decision making", "decision-making", "sound judgement", "make decisions", "using initiative"],
  },
  {
    id: "research",
    label: "Research",
    signals: ["research skills", "conducting research", "desk research", "evidence gathering", "literature review"],
  },
  {
    id: "commercial-awareness",
    label: "Commercial awareness",
    signals: ["commercial awareness", "commercially aware", "business acumen", "understanding of the market"],
  },
];
