export const PROBLEM_STATEMENTS = [
  {
    id: "PS-1",
    title: "Student Club Registration Portal",
    description: "Develop a portal where students can register for college clubs.",
    features: [
      "Add member",
      "Update profile",
      "Delete member",
      "Search by department",
      "View all registrations"
    ]
  },
  {
    id: "PS-2",
    title: "Event Registration System",
    description: "Develop a platform to register participants for a technical symposium.",
    features: [
      "Event registration",
      "Seat availability",
      "Participant list",
      "Search registrations",
      "Cancel registration"
    ]
  },
  {
    id: "PS-3",
    title: "Library Book Management",
    description: "Develop a web application to manage books in a library.",
    features: [
      "Add books",
      "Borrow books",
      "Return books",
      "Search books",
      "Delete books"
    ]
  },
  {
    id: "PS-4",
    title: "Expense Tracker",
    description: "Develop a personal expense management application.",
    features: [
      "Add expense",
      "Edit expense",
      "Delete expense",
      "Filter by category",
      "Monthly summary"
    ]
  },
  {
    id: "PS-5",
    title: "To-Do & Task Manager",
    description: "Develop a productivity application.",
    features: [
      "Add task",
      "Mark completed",
      "Edit task",
      "Delete task",
      "Filter tasks"
    ]
  },
  {
    id: "PS-6",
    title: "Attendance Manager",
    description: "Develop a classroom attendance portal.",
    features: [
      "Add student",
      "Mark attendance",
      "Search student",
      "Edit attendance",
      "Attendance summary"
    ]
  },
  {
    id: "PS-7",
    title: "Visitor Management System",
    description: "Develop a visitor entry portal.",
    features: [
      "Visitor registration",
      "Check-in",
      "Check-out",
      "Search visitor",
      "View logs"
    ]
  },
  {
    id: "PS-8",
    title: "Food Ordering Portal",
    description: "Develop a simple cafeteria ordering system.",
    features: [
      "Add menu items",
      "Place order",
      "Cancel order",
      "Search orders",
      "Order history"
    ]
  }
];

export const EVALUATION_CRITERIA = [
  {
    key: "functionalCompleteness",
    name: "Functional Completeness",
    maxMarks: 30,
    description: "Checking if all the required features of the problem statement are fully implemented and functional in the code."
  },
  {
    key: "databaseIntegration",
    name: "Database Integration",
    maxMarks: 15,
    description: "Assessing if database integration (localStorage, SQLite, MongoDB, Supabase, Firebase, or external API) is present and handled correctly (CRUD operations, schema structure)."
  },
  {
    key: "uiUxDesign",
    name: "UI/UX Design & Responsiveness",
    maxMarks: 15,
    description: "Evaluating style sheets, layout responsiveness, visual appeal, interactive design, and modern front-end aesthetics."
  },
  {
    key: "codeQuality",
    name: "Code Quality & Organization",
    maxMarks: 10,
    description: "Reviewing directory structures, naming conventions, readability, comments, component modularity, and use of best practices."
  },
  {
    key: "creativityInnovation",
    name: "Creativity & Innovation",
    maxMarks: 10,
    description: "Highlighting unique additional features, advanced animations, exceptional UI styling, or clever solutions to the problem."
  },
  {
    key: "validationErrorHandling",
    name: "Validation & Error Handling",
    maxMarks: 10,
    description: "Checking form input validation (e.g., email validation, empty field blocks) and robust API or data flow error handling (try-catch, fallback states)."
  },
  {
    key: "gitWorkflowPresentation",
    name: "Presentation, Demonstration & GitHub Workflow",
    maxMarks: 10,
    description: "Reviewing GitHub commit history quality, README richness, setup instructions, and clarity of documentation."
  }
];
