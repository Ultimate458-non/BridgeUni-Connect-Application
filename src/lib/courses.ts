// Course + resource data. Plain arrays — edit freely.
// BridgeUni does not host courses; every entry links out to the provider.

export const SECTORS = [
  "All",
  "Tech",
  "Business",
  "Marketing",
  "Healthcare",
  "Agriculture",
  "Job skills",
] as const;

export type Sector = (typeof SECTORS)[number];

/** Public article — readable without a LinkedIn account. Linked from the CV form and resources. */
export const LINKEDIN_GUIDE_URL =
  "https://www.linkedin.com/pulse/ultimate-guide-linkedin-profile-optimization-examples-kumar--0ezxc/";

export const SECTOR_INFO: Record<Exclude<Sector, "All">, { blurb: string; color: string }> = {
  Tech: { blurb: "Coding, websites and staying safe online", color: "var(--sector-tech)" },
  Business: { blurb: "Bookkeeping, money and running a business", color: "var(--sector-business)" },
  Marketing: { blurb: "Social media, content and customers", color: "var(--sector-marketing)" },
  Healthcare: { blurb: "Infection control and health basics", color: "var(--sector-healthcare)" },
  Agriculture: { blurb: "Food security and sustainable farming", color: "var(--sector-agriculture)" },
  "Job skills": { blurb: "Computers, email and getting hired", color: "var(--sector-jobskills)" },
};
export type CourseSector = Exclude<Sector, "All">;

export type Course = {
  id: string;
  sector: CourseSector;
  name: string;
  provider: string;
  url: string;
  /** Short badge, e.g. "Free certificate" */
  note: string;
  /** Added to the CV skills when the user finishes the course */
  skills: string[];
};

export type Resource = {
  id: string;
  name: string;
  url: string;
  medium: "Videos" | "Reading" | "Videos + reading";
  sectors: CourseSector[];
  blurb: string;
};

export const COURSES: Course[] = [
  {
    id: "fcc-rwd",
    sector: "Tech",
    name: "Responsive Web Design",
    provider: "freeCodeCamp",
    url: "https://www.freecodecamp.org/learn/2022/responsive-web-design/",
    note: "Free certification",
    skills: ["HTML", "CSS", "Responsive web design"],
  },
  {
    id: "cisco-cyber",
    sector: "Tech",
    name: "Introduction to Cybersecurity",
    provider: "Cisco Networking Academy",
    url: "https://www.netacad.com/courses/introduction-to-cybersecurity",
    note: "Free certificate",
    skills: ["Cybersecurity basics", "Online safety", "Network security"],
  },
  {
    id: "openlearn-bookkeeping",
    sector: "Business",
    name: "Introduction to bookkeeping and accounting",
    provider: "OpenLearn",
    url: "https://www.open.edu/openlearn/money-business/introduction-bookkeeping-and-accounting/content-section-0",
    note: "Free statement of participation",
    skills: ["Bookkeeping", "Basic accounting", "Financial records"],
  },
  {
    id: "hubspot-inbound",
    sector: "Marketing",
    name: "Inbound Marketing",
    provider: "HubSpot Academy",
    url: "https://academy.hubspot.com/courses/inbound-marketing",
    note: "Free certificate",
    skills: ["Inbound marketing", "Content marketing", "Customer journey"],
  },
  {
    id: "hubspot-social",
    sector: "Marketing",
    name: "Social Media Marketing",
    provider: "HubSpot Academy",
    url: "https://academy.hubspot.com/courses/social-media",
    note: "Free certificate",
    skills: ["Social media marketing", "Content planning"],
  },
  {
    id: "openwho-hand-hygiene",
    sector: "Healthcare",
    name: "Standard precautions: Hand hygiene",
    provider: "OpenWHO",
    url: "https://openwho.org/courses/IPC-HH-en",
    note: "Free record of achievement",
    skills: ["Infection prevention", "Hand hygiene"],
  },
  {
    id: "fao-elearning",
    sector: "Agriculture",
    name: "Food security and agriculture courses",
    provider: "FAO eLearning Academy",
    url: "https://elearning.fao.org/",
    note: "Free certificate",
    skills: ["Food security", "Sustainable agriculture"],
  },
  {
    id: "ms-digital-literacy",
    sector: "Job skills",
    name: "Digital Literacy",
    provider: "Microsoft",
    url: "https://www.microsoft.com/en-us/digital-literacy",
    note: "Free certificate",
    skills: ["Computer basics", "Email", "Microsoft Office basics"],
  },
];

export const RESOURCES: Resource[] = [
  {
    id: "fcc-youtube",
    name: "freeCodeCamp on YouTube",
    url: "https://www.youtube.com/@freecodecamp",
    medium: "Videos",
    sectors: ["Tech"],
    blurb: "Full-length coding courses, start to finish.",
  },
  {
    id: "w3schools",
    name: "W3Schools",
    url: "https://www.w3schools.com/",
    medium: "Reading",
    sectors: ["Tech"],
    blurb: "Short web and coding lessons with try-it examples.",
  },
  {
    id: "mdn-learn",
    name: "MDN Learn",
    url: "https://developer.mozilla.org/en-US/docs/Learn",
    medium: "Reading",
    sectors: ["Tech"],
    blurb: "Beginner web development guides from Mozilla.",
  },
  {
    id: "mit-ocw",
    name: "MIT OpenCourseWare",
    url: "https://ocw.mit.edu/",
    medium: "Videos + reading",
    sectors: ["Tech", "Business"],
    blurb: "Real university lectures and notes, free to open.",
  },
  {
    id: "gcfglobal",
    name: "GCFGlobal",
    url: "https://edu.gcfglobal.org/en/",
    medium: "Videos + reading",
    sectors: ["Job skills", "Tech"],
    blurb: "Computer basics, email, Excel, job search and work skills.",
  },
  {
    id: "khan-academy",
    name: "Khan Academy",
    url: "https://www.khanacademy.org/",
    medium: "Videos + reading",
    sectors: ["Business", "Job skills"],
    blurb: "Maths, economics and personal finance, step by step.",
  },
  {
    id: "openstax",
    name: "OpenStax",
    url: "https://openstax.org/",
    medium: "Reading",
    sectors: ["Business", "Healthcare"],
    blurb: "Free textbooks — business, anatomy, nursing basics and more.",
  },
  {
    id: "crash-course",
    name: "Crash Course on YouTube",
    url: "https://www.youtube.com/@crashcourse",
    medium: "Videos",
    sectors: ["Business", "Healthcare", "Tech"],
    blurb: "Quick, clear video series on economics, anatomy and computing.",
  },
  {
    id: "who-topics",
    name: "WHO health topics",
    url: "https://www.who.int/health-topics",
    medium: "Reading",
    sectors: ["Healthcare"],
    blurb: "Plain fact sheets on diseases, care and public health.",
  },
  {
    id: "fao-publications",
    name: "FAO publications",
    url: "https://www.fao.org/publications/en",
    medium: "Reading",
    sectors: ["Agriculture"],
    blurb: "Farming, food security and climate guides from the UN.",
  },
  {
    id: "linkedin-profile-guide",
    name: "LinkedIn profile guide, with examples",
    url: LINKEDIN_GUIDE_URL,
    medium: "Reading",
    sectors: ["Job skills", "Marketing"],
    blurb: "Step by step: photo, headline, About section and skills, with examples.",
  },
  {
    id: "indeed-career-guide",
    name: "Indeed Career Guide",
    url: "https://www.indeed.com/career-advice",
    medium: "Reading",
    sectors: ["Job skills", "Marketing"],
    blurb: "CV tips, interview questions and cover letter examples.",
  },
];
