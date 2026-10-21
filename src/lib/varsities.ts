// Varsity Explorer data. Facts here come from each institution's own website (see `sources`).
// We do NOT invent campus photos or course details: tours show real 360° photos once the team
// adds them to /public/tours (see `scenes`), and a clearly labelled sample scene until then.

export type Scene = {
  id: string;
  title: string;
  /**
   * An equirectangular 360° photo (2:1, e.g. 4096×2048 JPG ≈ 1–2 MB) in /public/tours/…,
   * plus an optional small version (e.g. 2048×1024 ≈ 300 KB) for low-end phones.
   * Leave both empty to use the built-in, clearly labelled SAMPLE scene.
   */
  src?: string;
  srcLight?: string;
  caption: string;
};

export type Institution = {
  id: "ufs" | "cut" | "motheo";
  short: string;
  name: string;
  kind: "University" | "University of technology" | "TVET college";
  /** Campuses inside Mangaung (Bloemfontein, Botshabelo, Thaba 'Nchu). */
  mangaungCampuses: string[];
  website: string;
  /** The institution's own tour / visit option, if it has one. */
  officialTour?: { label: string; url: string; note: string };
  /**
   * The institution's own live 360° tour, shown inside the explorer (credited, loaded only on tap).
   * When set, it replaces the sample scene for this institution.
   */
  liveTour?: { url: string; title: string; credit: string };
  pathway: PathwayId;
  scenes: Scene[];
  sources: string[];
};

export type PathwayId = "university" | "uot" | "tvet";

export type DayStep = { time: string; title: string; body: string };

export type Pathway = {
  id: PathwayId;
  title: string;
  blurb: string;
  day: DayStep[];
  ask: string[];
};

const SAMPLE_SCENE: Scene = {
  id: "sample",
  title: "Sample scene",
  caption: "Illustration only — not a photo of this campus. Real 360° photos will appear here once added.",
};

export const INSTITUTIONS: Institution[] = [
  {
    id: "ufs",
    short: "UFS",
    name: "University of the Free State",
    kind: "University",
    mangaungCampuses: ["Bloemfontein Campus"],
    website: "https://www.ufs.ac.za/",
    officialTour: {
      label: "UFS Virtual Orientation",
      url: "https://www.ufs.ac.za/virtualorientationbfn/",
      note: "The university's own online orientation for the Bloemfontein Campus.",
    },
    pathway: "university",
    liveTour: {
      url: "https://www.ufs.ac.za/virtualorientationbfn/",
      title: "UFS Virtual Orientation — official 360° tour of the Bloemfontein Campus",
      credit: "Official tour by the University of the Free State, shown from ufs.ac.za",
    },
    scenes: [SAMPLE_SCENE],
    sources: ["https://www.ufs.ac.za/virtualorientationbfn/"],
  },
  {
    id: "cut",
    short: "CUT",
    name: "Central University of Technology, Free State",
    kind: "University of technology",
    mangaungCampuses: ["Bloemfontein Campus"],
    website: "https://www.cut.ac.za/",
    officialTour: {
      label: "Book a CUT campus visit",
      url: "https://www.cut.ac.za/visit-institution",
      note: "In-person guided tours for Grade 12 learners, booked by schools.",
    },
    pathway: "uot",
    scenes: [SAMPLE_SCENE],
    sources: ["https://www.cut.ac.za/visit-institution"],
  },
  {
    id: "motheo",
    short: "Motheo",
    name: "Motheo TVET College",
    kind: "TVET college",
    mangaungCampuses: ["Bloemfontein Campus", "Hillside View Campus", "Thaba 'Nchu Campus", "Botshabelo Campus"],
    website: "https://www.motheotvet.edu.za/",
    pathway: "tvet",
    scenes: [SAMPLE_SCENE],
    sources: ["https://www.motheotvet.edu.za/about.html"],
  },
];

/*
 * "Day in the Life" walkthroughs describe how each TYPE of study usually works, in general
 * terms — not a real timetable for a named course. Each one ends with questions to ask the
 * institution, because days differ by programme and year.
 */
export const PATHWAYS: Pathway[] = [
  {
    id: "university",
    title: "Day in the life: university degree",
    blurb: "Degrees mix big lectures, smaller tutorials and a lot of reading on your own.",
    day: [
      { time: "Morning", title: "Lecture", body: "A lecturer teaches a large class. You take notes; slides are often shared online afterwards." },
      { time: "Late morning", title: "Tutorial", body: "A smaller group works through problems or discusses readings with a tutor. Come prepared." },
      { time: "Lunch", title: "Campus break", body: "Eat, meet classmates, or visit student support if you need help with money, health or studies." },
      { time: "Afternoon", title: "Library and self-study", body: "Reading, assignments and group projects. Independent study is a big part of a degree." },
      { time: "Evening", title: "Catch up", body: "Review the day's notes and plan for tests. Many students study in groups." },
    ],
    ask: ["What does a first-year timetable look like for my course?", "How many contact hours a week?", "What support is there for first-year students?"],
  },
  {
    id: "uot",
    title: "Day in the life: university of technology",
    blurb: "Career-focused diplomas and degrees with lots of practical, hands-on work.",
    day: [
      { time: "Morning", title: "Class", body: "Theory for your field, usually in smaller groups than a traditional university." },
      { time: "Late morning", title: "Lab, studio or workshop", body: "Practical sessions where you use the equipment and methods of the job." },
      { time: "Lunch", title: "Campus break", body: "Time to eat, rest and connect with classmates or student services." },
      { time: "Afternoon", title: "Project work", body: "Practical projects and assignments, often done in teams like a real workplace." },
      { time: "Later in the course", title: "Work-integrated learning", body: "Many programmes include time learning in a real workplace. Ask whether yours does." },
    ],
    ask: ["Does my programme include work-integrated learning?", "What practical facilities will I use?", "What are the entry requirements?"],
  },
  {
    id: "tvet",
    title: "Day in the life: TVET college",
    blurb: "Practical, job-ready training — NC(V), NATED (N1–N6) and occupational programmes.",
    day: [
      { time: "Morning", title: "Theory class", body: "Classroom lessons on the subjects of your programme, in a school-like timetable." },
      { time: "Late morning", title: "Practical training", body: "Hands-on work in a workshop, computer lab or practice room, depending on the programme." },
      { time: "Lunch", title: "Break", body: "Time to eat and rest. Ask about bursary and student support offices on your campus." },
      { time: "Afternoon", title: "More practicals or assessments", body: "Practical tasks, tests and portfolio work that count towards your results." },
      { time: "After the course", title: "Workplace experience", body: "Many programmes lead to an apprenticeship, learnership or workplace training. Ask what yours leads to." },
    ],
    ask: ["Which campus offers my programme?", "Is it NC(V), NATED or occupational?", "What bursaries can I apply for?"],
  },
];

export const pathwayOf = (id: PathwayId) => PATHWAYS.find((p) => p.id === id)!;

/** Words that should bring up the Varsity Explorer in search. */
export const EXPLORER_KEYWORDS = [
  "campus", "tour", "tours", "virtual", "360", "vr", "webxr", "varsity", "varsities", "university", "universities",
  "tvet", "college", "ufs", "cut", "motheo", "free state", "bloemfontein", "mangaung", "thaba", "botshabelo",
  "hillside", "day in the life", "study", "explorer",
];
