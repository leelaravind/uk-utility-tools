/**
 * Role vocabulary.
 *
 * Drives the guess at which job the visitor is applying for, from a job title
 * they type or a title line in an advert they paste. `signals` are matched as
 * lowercase substrings against that title, and the seniority and industries on
 * the winning role then colour which content blocks the composer may use.
 *
 * ORDER MATTERS. The matcher walks this list in order, so a more specific role
 * must appear before a broader one whose signals could also fire — "engineering
 * manager" before "software engineer", "store manager" before "retail
 * assistant". Keep new entries in the block for their industry and put the
 * specific title above the general one.
 *
 * ADDING AN ENTRY.
 *  - `id` is stable kebab-case and is referenced elsewhere; never rename one,
 *    add a new entry instead.
 *  - `signals` are 3–8 lowercase fragments as they appear in real job titles.
 *    Avoid fragments short enough to match inside unrelated words: "swe" hides
 *    inside "answer", "intern" inside "internal", "aca" inside "vacancy" and
 *    "heo" inside "theory". Prefer the full phrase.
 *  - `seniority` lists the levels the title itself implies, not every level a
 *    person in that field could reach.
 *  - British English spellings and titles. No real employer names.
 */

import type { RoleDefinition } from "./types";

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  /* ---------------------------------------------------------------- */
  /* Technology and data                                              */
  /* ---------------------------------------------------------------- */
  {
    id: "engineering-manager",
    label: "Engineering manager",
    industries: ["technology"],
    seniority: ["lead", "manager", "executive"],
    signals: [
      "engineering manager",
      "head of engineering",
      "development manager",
      "technical lead",
      "tech lead",
      "team lead engineer",
    ],
  },
  {
    id: "devops-engineer",
    label: "DevOps engineer",
    industries: ["technology"],
    seniority: ["junior", "mid", "senior", "lead"],
    signals: [
      "devops",
      "site reliability engineer",
      "platform engineer",
      "infrastructure engineer",
      "cloud engineer",
      "build engineer",
    ],
  },
  {
    id: "qa-engineer",
    label: "QA engineer",
    industries: ["technology"],
    seniority: ["graduate", "junior", "mid", "senior"],
    signals: [
      "qa engineer",
      "test engineer",
      "quality assurance analyst",
      "software tester",
      "test analyst",
      "automation tester",
    ],
  },
  {
    id: "cyber-security-analyst",
    label: "Cyber security analyst",
    industries: ["technology", "public-sector"],
    seniority: ["junior", "mid", "senior"],
    signals: [
      "security analyst",
      "cyber security",
      "information security",
      "soc analyst",
      "penetration tester",
      "security engineer",
    ],
  },
  {
    id: "data-scientist",
    label: "Data scientist",
    industries: ["technology", "science", "finance"],
    seniority: ["graduate", "junior", "mid", "senior"],
    signals: [
      "data scientist",
      "data science",
      "machine learning engineer",
      "ml engineer",
      "research engineer",
    ],
  },
  {
    id: "data-analyst",
    label: "Data analyst",
    industries: ["technology", "finance", "public-sector"],
    seniority: ["graduate", "junior", "mid", "senior"],
    signals: [
      "data analyst",
      "business intelligence analyst",
      "bi analyst",
      "reporting analyst",
      "insight analyst",
      "mi analyst",
    ],
  },
  {
    id: "software-engineer",
    label: "Software engineer",
    industries: ["technology"],
    seniority: ["graduate", "junior", "mid", "senior", "lead"],
    signals: [
      "software engineer",
      "software developer",
      "software engineering",
      "developer",
      "programmer",
      "full stack",
      "back end developer",
      "front end developer",
    ],
  },
  {
    id: "systems-administrator",
    label: "Systems administrator",
    industries: ["technology"],
    seniority: ["junior", "mid", "senior"],
    signals: [
      "systems administrator",
      "sysadmin",
      "network administrator",
      "network engineer",
      "infrastructure administrator",
    ],
  },
  {
    id: "it-support-technician",
    label: "IT support technician",
    industries: ["technology", "customer-service"],
    seniority: ["junior", "mid"],
    signals: [
      "it support",
      "service desk",
      "helpdesk",
      "help desk",
      "desktop support",
      "first line support",
      "second line support",
    ],
  },
  {
    id: "business-analyst",
    label: "Business analyst",
    industries: ["technology", "finance", "public-sector"],
    seniority: ["junior", "mid", "senior"],
    signals: [
      "business analyst",
      "systems analyst",
      "requirements analyst",
      "process analyst",
      "business change analyst",
    ],
  },
  {
    id: "product-manager",
    label: "Product manager",
    industries: ["technology"],
    seniority: ["mid", "senior", "lead", "manager"],
    signals: [
      "product manager",
      "product owner",
      "head of product",
      "product lead",
      "associate product manager",
    ],
  },
  {
    id: "ux-designer",
    label: "UX designer",
    industries: ["technology", "creative"],
    seniority: ["junior", "mid", "senior"],
    signals: [
      "ux designer",
      "user experience designer",
      "ui designer",
      "product designer",
      "ux researcher",
      "interaction designer",
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Creative, content and marketing                                  */
  /* ---------------------------------------------------------------- */
  {
    id: "graphic-designer",
    label: "Graphic designer",
    industries: ["creative"],
    seniority: ["junior", "mid", "senior"],
    signals: [
      "graphic designer",
      "visual designer",
      "artworker",
      "brand designer",
      "junior designer",
      "midweight designer",
    ],
  },
  {
    id: "video-editor",
    label: "Video editor",
    industries: ["creative"],
    seniority: ["junior", "mid", "senior"],
    signals: [
      "video editor",
      "videographer",
      "motion graphics",
      "post production editor",
      "content producer",
    ],
  },
  {
    id: "content-writer",
    label: "Content writer",
    industries: ["creative", "technology"],
    seniority: ["junior", "mid", "senior"],
    signals: [
      "content writer",
      "copywriter",
      "content designer",
      "technical writer",
      "editorial assistant",
      "content executive",
    ],
  },
  {
    id: "social-media-manager",
    label: "Social media manager",
    industries: ["creative", "sales"],
    seniority: ["junior", "mid", "manager"],
    signals: [
      "social media manager",
      "social media executive",
      "community manager",
      "social media assistant",
      "content creator",
    ],
  },
  {
    id: "marketing-manager",
    label: "Marketing manager",
    industries: ["sales", "creative"],
    seniority: ["mid", "senior", "manager"],
    signals: [
      "marketing manager",
      "head of marketing",
      "brand manager",
      "campaign manager",
      "digital marketing manager",
    ],
  },
  {
    id: "marketing-executive",
    label: "Marketing executive",
    industries: ["sales", "creative"],
    seniority: ["graduate", "junior", "mid"],
    signals: [
      "marketing executive",
      "marketing assistant",
      "digital marketing executive",
      "marketing coordinator",
      "seo executive",
      "ppc executive",
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Sales and customer service                                       */
  /* ---------------------------------------------------------------- */
  {
    id: "business-development-manager",
    label: "Business development manager",
    industries: ["sales"],
    seniority: ["mid", "senior", "manager"],
    signals: [
      "business development",
      "bdm",
      "new business manager",
      "partnerships manager",
      "sales manager",
    ],
  },
  {
    id: "account-manager",
    label: "Account manager",
    industries: ["sales", "customer-service"],
    seniority: ["junior", "mid", "senior"],
    signals: [
      "account manager",
      "client manager",
      "customer success manager",
      "key account",
      "account executive",
      "client relationship manager",
    ],
  },
  {
    id: "sales-executive",
    label: "Sales executive",
    industries: ["sales", "retail"],
    seniority: ["junior", "mid"],
    signals: [
      "sales executive",
      "sales representative",
      "sales advisor",
      "field sales",
      "telesales",
      "sales consultant",
    ],
  },
  {
    id: "call-centre-agent",
    label: "Call centre agent",
    industries: ["customer-service"],
    seniority: ["junior", "mid"],
    signals: [
      "call centre",
      "contact centre",
      "call handler",
      "telephone advisor",
      "inbound advisor",
      "customer contact advisor",
    ],
  },
  {
    id: "customer-service-advisor",
    label: "Customer service advisor",
    industries: ["customer-service", "retail"],
    seniority: ["junior", "mid"],
    signals: [
      "customer service advisor",
      "customer service assistant",
      "customer advisor",
      "customer support",
      "service advisor",
      "customer care",
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Finance                                                          */
  /* ---------------------------------------------------------------- */
  {
    id: "actuary",
    label: "Actuary",
    industries: ["finance"],
    seniority: ["graduate", "junior", "mid", "senior"],
    signals: ["actuary", "actuarial analyst", "actuarial trainee", "actuarial consultant"],
  },
  {
    id: "auditor",
    label: "Auditor",
    industries: ["finance"],
    seniority: ["graduate", "junior", "mid", "senior"],
    signals: [
      "auditor",
      "internal audit",
      "external audit",
      "audit assistant",
      "audit senior",
      "audit manager",
    ],
  },
  {
    id: "financial-analyst",
    label: "Financial analyst",
    industries: ["finance"],
    seniority: ["graduate", "junior", "mid", "senior"],
    signals: [
      "financial analyst",
      "finance analyst",
      "investment analyst",
      "commercial analyst",
      "fp&a analyst",
    ],
  },
  {
    id: "accountant",
    label: "Accountant",
    industries: ["finance"],
    seniority: ["junior", "mid", "senior", "manager"],
    signals: [
      "accountant",
      "management accountant",
      "financial accountant",
      "chartered accountant",
      "finance manager",
      "acca",
      "cima",
    ],
  },
  {
    id: "accounts-assistant",
    label: "Accounts assistant",
    industries: ["finance"],
    seniority: ["junior", "mid"],
    signals: [
      "accounts assistant",
      "accounts payable",
      "accounts receivable",
      "purchase ledger",
      "sales ledger",
      "bookkeeper",
      "finance assistant",
    ],
  },
  {
    id: "compliance-officer",
    label: "Compliance officer",
    industries: ["finance", "legal", "public-sector"],
    seniority: ["mid", "senior", "manager"],
    signals: [
      "compliance officer",
      "compliance manager",
      "risk analyst",
      "aml analyst",
      "regulatory affairs",
      "financial crime analyst",
    ],
  },
  {
    id: "payroll-administrator",
    label: "Payroll administrator",
    industries: ["finance"],
    seniority: ["junior", "mid"],
    signals: [
      "payroll administrator",
      "payroll officer",
      "payroll assistant",
      "payroll manager",
      "payroll clerk",
    ],
  },
  {
    id: "procurement-officer",
    label: "Procurement officer",
    industries: ["public-sector", "logistics", "manufacturing"],
    seniority: ["junior", "mid", "senior"],
    signals: [
      "procurement officer",
      "procurement manager",
      "buyer",
      "purchasing assistant",
      "category manager",
      "sourcing manager",
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Education                                                        */
  /* ---------------------------------------------------------------- */
  {
    id: "teaching-assistant",
    label: "Teaching assistant",
    industries: ["education"],
    seniority: ["junior", "mid"],
    signals: [
      "teaching assistant",
      "learning support assistant",
      "classroom assistant",
      "sen teaching assistant",
      "higher level teaching assistant",
    ],
  },
  {
    id: "teacher",
    label: "Teacher",
    industries: ["education"],
    seniority: ["graduate", "junior", "mid", "senior"],
    signals: [
      "teacher",
      "primary teacher",
      "secondary teacher",
      "nqt",
      "early career teacher",
      "class teacher",
      "head of department",
    ],
  },
  {
    id: "lecturer",
    label: "Lecturer",
    industries: ["education"],
    seniority: ["mid", "senior"],
    signals: [
      "lecturer",
      "further education tutor",
      "assistant professor",
      "academic tutor",
      "course leader",
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Healthcare and social care                                       */
  /* ---------------------------------------------------------------- */
  {
    id: "nurse",
    label: "Nurse",
    industries: ["healthcare"],
    seniority: ["graduate", "junior", "mid", "senior"],
    signals: [
      "registered nurse",
      "staff nurse",
      "nurse",
      "nursing associate",
      "ward sister",
      "band 5 nurse",
    ],
  },
  {
    id: "healthcare-assistant",
    label: "Healthcare assistant",
    industries: ["healthcare"],
    seniority: ["junior", "mid"],
    signals: [
      "healthcare assistant",
      "health care assistant",
      "hca",
      "clinical support worker",
      "ward assistant",
    ],
  },
  {
    id: "pharmacist",
    label: "Pharmacist",
    industries: ["healthcare"],
    seniority: ["graduate", "junior", "mid", "senior"],
    signals: [
      "pharmacist",
      "pharmacy technician",
      "dispensing assistant",
      "pharmacy assistant",
      "clinical pharmacist",
    ],
  },
  {
    id: "physiotherapist",
    label: "Physiotherapist",
    industries: ["healthcare"],
    seniority: ["graduate", "junior", "mid", "senior"],
    signals: [
      "physiotherapist",
      "occupational therapist",
      "therapy assistant",
      "rehabilitation assistant",
      "speech and language therapist",
    ],
  },
  {
    id: "care-worker",
    label: "Care worker",
    industries: ["healthcare", "nonprofit"],
    seniority: ["junior", "mid"],
    signals: [
      "care assistant",
      "care worker",
      "carer",
      "domiciliary care",
      "residential care",
      "senior carer",
    ],
  },
  {
    id: "support-worker",
    label: "Support worker",
    industries: ["healthcare", "nonprofit"],
    seniority: ["junior", "mid"],
    signals: [
      "support worker",
      "mental health support",
      "learning disability support",
      "outreach worker",
      "recovery worker",
    ],
  },
  {
    id: "social-worker",
    label: "Social worker",
    industries: ["public-sector", "healthcare", "nonprofit"],
    seniority: ["graduate", "junior", "mid", "senior"],
    signals: [
      "social worker",
      "social work assistant",
      "safeguarding officer",
      "family support worker",
      "children's social worker",
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Science and laboratory                                           */
  /* ---------------------------------------------------------------- */
  {
    id: "research-scientist",
    label: "Research scientist",
    industries: ["science"],
    seniority: ["graduate", "junior", "mid", "senior"],
    signals: [
      "research scientist",
      "research associate",
      "postdoctoral",
      "research fellow",
      "development scientist",
    ],
  },
  {
    id: "lab-technician",
    label: "Laboratory technician",
    industries: ["science", "healthcare"],
    seniority: ["junior", "mid"],
    signals: [
      "laboratory technician",
      "lab technician",
      "laboratory assistant",
      "laboratory analyst",
      "biomedical support worker",
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Engineering, construction and trades                             */
  /* ---------------------------------------------------------------- */
  {
    id: "mechanical-engineer",
    label: "Mechanical engineer",
    industries: ["engineering", "manufacturing"],
    seniority: ["graduate", "junior", "mid", "senior"],
    signals: [
      "mechanical engineer",
      "design engineer",
      "maintenance engineer",
      "manufacturing engineer",
      "process engineer",
    ],
  },
  {
    id: "electrical-engineer",
    label: "Electrical engineer",
    industries: ["engineering", "manufacturing"],
    seniority: ["graduate", "junior", "mid", "senior"],
    signals: [
      "electrical engineer",
      "electronics engineer",
      "controls engineer",
      "instrumentation engineer",
      "automation engineer",
    ],
  },
  {
    id: "civil-engineer",
    label: "Civil engineer",
    industries: ["construction", "engineering"],
    seniority: ["graduate", "junior", "mid", "senior"],
    signals: [
      "civil engineer",
      "structural engineer",
      "highways engineer",
      "geotechnical engineer",
      "site engineer",
    ],
  },
  {
    id: "quantity-surveyor",
    label: "Quantity surveyor",
    industries: ["construction"],
    seniority: ["graduate", "junior", "mid", "senior"],
    signals: [
      "quantity surveyor",
      "quantity surveying",
      "cost consultant",
      "estimator",
      "commercial manager construction",
    ],
  },
  {
    id: "site-manager",
    label: "Construction site manager",
    industries: ["construction"],
    seniority: ["mid", "senior", "manager"],
    signals: [
      "site manager",
      "construction manager",
      "site supervisor",
      "foreman",
      "works manager",
      "project manager construction",
    ],
  },
  {
    id: "electrician",
    label: "Electrician",
    industries: ["construction", "engineering"],
    seniority: ["junior", "mid", "senior"],
    signals: [
      "electrician",
      "electrical technician",
      "approved electrician",
      "maintenance electrician",
      "electrical improver",
    ],
  },
  {
    id: "production-operative",
    label: "Production operative",
    industries: ["manufacturing"],
    seniority: ["junior", "mid"],
    signals: [
      "production operative",
      "machine operator",
      "assembly operative",
      "factory operative",
      "cnc machinist",
      "process operative",
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Logistics                                                        */
  /* ---------------------------------------------------------------- */
  {
    id: "logistics-coordinator",
    label: "Logistics coordinator",
    industries: ["logistics"],
    seniority: ["junior", "mid", "senior"],
    signals: [
      "logistics coordinator",
      "transport planner",
      "supply chain coordinator",
      "shipping coordinator",
      "transport administrator",
      "logistics manager",
    ],
  },
  {
    id: "warehouse-operative",
    label: "Warehouse operative",
    industries: ["logistics"],
    seniority: ["junior", "mid"],
    signals: [
      "warehouse operative",
      "warehouse assistant",
      "order picker",
      "picker packer",
      "forklift driver",
      "goods in operative",
    ],
  },
  {
    id: "delivery-driver",
    label: "Delivery driver",
    industries: ["logistics"],
    seniority: ["junior", "mid"],
    signals: [
      "delivery driver",
      "hgv driver",
      "lgv driver",
      "van driver",
      "multi drop driver",
      "courier",
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Retail and hospitality                                           */
  /* ---------------------------------------------------------------- */
  {
    id: "store-manager",
    label: "Store manager",
    industries: ["retail"],
    seniority: ["mid", "senior", "manager"],
    signals: [
      "store manager",
      "branch manager",
      "retail manager",
      "assistant store manager",
      "department manager",
      "duty manager retail",
    ],
  },
  {
    id: "retail-assistant",
    label: "Retail assistant",
    industries: ["retail"],
    seniority: ["student", "junior", "mid"],
    signals: [
      "retail assistant",
      "sales assistant",
      "shop assistant",
      "store assistant",
      "customer assistant",
      "checkout operator",
    ],
  },
  {
    id: "chef",
    label: "Chef",
    industries: ["hospitality"],
    seniority: ["junior", "mid", "senior", "manager"],
    signals: [
      "chef",
      "chef de partie",
      "sous chef",
      "head chef",
      "commis chef",
      "kitchen assistant",
    ],
  },
  {
    id: "waiting-staff",
    label: "Waiting staff",
    industries: ["hospitality"],
    seniority: ["student", "junior", "mid"],
    signals: [
      "waiting staff",
      "waiter",
      "waitress",
      "front of house",
      "bar staff",
      "barista",
      "food and beverage assistant",
    ],
  },
  {
    id: "hotel-receptionist",
    label: "Hotel receptionist",
    industries: ["hospitality"],
    seniority: ["junior", "mid"],
    signals: [
      "hotel receptionist",
      "front desk agent",
      "guest services",
      "night auditor",
      "reservations agent",
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Delivery, operations and people                                  */
  /* ---------------------------------------------------------------- */
  {
    id: "programme-manager",
    label: "Programme manager",
    industries: ["general", "technology", "public-sector"],
    seniority: ["senior", "lead", "manager", "executive"],
    signals: [
      "programme manager",
      "program manager",
      "portfolio manager",
      "pmo lead",
      "head of delivery",
    ],
  },
  {
    id: "project-manager",
    label: "Project manager",
    industries: ["general", "technology", "construction"],
    seniority: ["mid", "senior", "lead", "manager"],
    signals: [
      "project manager",
      "project lead",
      "delivery manager",
      "project coordinator",
      "scrum master",
      "project officer",
    ],
  },
  {
    id: "operations-manager",
    label: "Operations manager",
    industries: ["general", "logistics", "customer-service"],
    seniority: ["senior", "manager", "executive"],
    signals: [
      "operations manager",
      "head of operations",
      "service delivery manager",
      "operations lead",
      "operations supervisor",
    ],
  },
  {
    id: "hr-advisor",
    label: "HR advisor",
    industries: ["general", "public-sector"],
    seniority: ["junior", "mid", "senior"],
    signals: [
      "hr advisor",
      "human resources advisor",
      "people advisor",
      "hr officer",
      "hr business partner",
      "hr assistant",
    ],
  },
  {
    id: "recruiter",
    label: "Recruiter",
    industries: ["general", "sales"],
    seniority: ["junior", "mid", "senior"],
    signals: [
      "recruiter",
      "recruitment consultant",
      "talent acquisition",
      "resourcer",
      "recruitment advisor",
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Legal and public sector                                          */
  /* ---------------------------------------------------------------- */
  {
    id: "solicitor",
    label: "Solicitor",
    industries: ["legal"],
    seniority: ["graduate", "junior", "mid", "senior"],
    signals: [
      "solicitor",
      "trainee solicitor",
      "in-house counsel",
      "associate solicitor",
      "lawyer",
    ],
  },
  {
    id: "paralegal",
    label: "Paralegal",
    industries: ["legal"],
    seniority: ["graduate", "junior", "mid"],
    signals: [
      "paralegal",
      "legal assistant",
      "legal executive",
      "litigation assistant",
      "legal secretary",
      "conveyancing assistant",
    ],
  },
  {
    id: "policy-adviser",
    label: "Policy adviser",
    industries: ["public-sector", "nonprofit"],
    seniority: ["junior", "mid", "senior"],
    signals: [
      "policy adviser",
      "policy advisor",
      "policy officer",
      "policy analyst",
      "public affairs officer",
    ],
  },
  {
    id: "civil-servant",
    label: "Civil servant",
    industries: ["public-sector"],
    seniority: ["graduate", "junior", "mid", "senior"],
    signals: [
      "civil servant",
      "civil service",
      "higher executive officer",
      "executive officer",
      "government department",
      "fast stream",
    ],
  },
  {
    id: "local-government-officer",
    label: "Local government officer",
    industries: ["public-sector"],
    seniority: ["junior", "mid", "senior"],
    signals: [
      "council officer",
      "local authority officer",
      "housing officer",
      "revenues and benefits",
      "planning officer",
      "environmental health officer",
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Administration                                                   */
  /* ---------------------------------------------------------------- */
  {
    id: "executive-assistant",
    label: "Executive assistant",
    industries: ["general"],
    seniority: ["mid", "senior"],
    signals: [
      "executive assistant",
      "personal assistant",
      "pa to the",
      "office manager",
      "team secretary",
    ],
  },
  {
    id: "administrator",
    label: "Administrator",
    industries: ["general", "public-sector"],
    seniority: ["junior", "mid"],
    signals: [
      "administrator",
      "admin assistant",
      "office administrator",
      "business support officer",
      "data entry clerk",
      "clerical officer",
    ],
  },
  {
    id: "receptionist",
    label: "Receptionist",
    industries: ["general", "customer-service"],
    seniority: ["junior", "mid"],
    signals: [
      "receptionist",
      "medical receptionist",
      "front of house receptionist",
      "reception administrator",
      "switchboard operator",
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Charity                                                          */
  /* ---------------------------------------------------------------- */
  {
    id: "charity-fundraiser",
    label: "Charity fundraiser",
    industries: ["nonprofit"],
    seniority: ["junior", "mid", "senior"],
    signals: [
      "fundraiser",
      "fundraising officer",
      "community fundraiser",
      "development officer",
      "grants officer",
      "trusts and foundations",
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Early careers                                                    */
  /* ---------------------------------------------------------------- */
  {
    id: "graduate-trainee",
    label: "Graduate scheme trainee",
    industries: ["general"],
    seniority: ["graduate"],
    signals: [
      "graduate scheme",
      "graduate trainee",
      "graduate programme",
      "graduate analyst",
      "graduate role",
      "trainee scheme",
    ],
  },
  {
    id: "apprentice",
    label: "Apprentice",
    industries: ["general"],
    seniority: ["student", "junior"],
    signals: [
      "apprentice",
      "apprenticeship",
      "level 3 apprentice",
      "degree apprenticeship",
      "trainee technician",
    ],
  },
  {
    id: "intern",
    label: "Intern",
    industries: ["general"],
    seniority: ["student", "graduate"],
    signals: [
      "internship",
      "summer intern",
      "intern position",
      "placement student",
      "industrial placement",
      "summer analyst",
    ],
  },
];
