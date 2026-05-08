# MyLife

**MyLife** is a comprehensive personal life management system designed to track finances, study sessions, notes, and goals within a centralized dashboard. Built with a modern UI, the application emphasizes productivity, security, and an optimized user experience.

---

## Features

- **Dashboard**: A comprehensive overview of primary life metrics and activities.
- **Finance Tracker**: A module to track income and expenses equipped with data visualization charts.
- **Study Timer**: A structured Pomodoro timer to enhance focus and manage study sessions.
- **Private Notes**: A secure, PIN-protected environment for personal notes.
- **Social Feed**: A timeline feature to view posts, updates, and interactions.
- **Social Profile**: User profile management and customizable settings.
- **Character**: A gamified progression system for self-improvement tracking.
- **360 Days**: A persistent habit and goal tracker designed for long-term consistency.

---

## Technology Stack

The application leverages a robust modern stack to ensure performance and scalability:

- **Frontend Framework**: React 18
- **Language**: TypeScript
- **Backend & Authentication**: Firebase (Auth, Firestore)
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Animations**: Framer Motion

---

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- A Firebase Project with Authentication and Firestore enabled

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/zero0-sys/mylife.git
   cd mylife
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   *Note: Populate the `.env` file with your specific Firebase configuration values.*

### Running the Application

To start the development server, run:
```bash
npm run dev
```

---

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for complete details.
