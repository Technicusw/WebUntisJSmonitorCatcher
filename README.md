# WebUntisMonitorCatcherJS
## WebUntis Monitor Timetable Fetcher

A flexible Node.js module designed to fetch and display timetable and substitution data directly from WebUntis monitor pages. This tool is versatile: it can be run as an interactive command-line script or easily imported into your own Node.js applications for custom use cases.

It is built with extensibility and privacy in mind, requiring no hardcoded personal credentials or school-specific configurations within its core logic, making it safe and easy to share and adapt.

## Features

-   **Real-time Data:** Fetches live timetable and substitution information from your school's WebUntis monitor.
-   **Flexible Queries:** Supports querying specific dates, date offsets (e.g., tomorrow, next week), and custom date ranges.
-   **Class/Course Filtering:** Filter results by one or multiple specific class names or course codes (e.g., '11a', ['12', '13']). If no filter is applied, all available data is displayed.
-   **Comprehensive Lesson Display:** Shows all scheduled lessons, including those that are not cancelled, with clear indicators for substitutions or cancellations.
-   **Interactive CLI:** A user-friendly command-line interface allows you to quickly query data by entering dates and classes.
-   **Modular Design:** Exported core functions enable easy integration into other Node.js projects.
-   **Publish-Ready:** Core logic is free of hardcoded personal or school-specific data, making it suitable for public sharing and reuse.

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/en/download/) (v14 or higher recommended)
-   `npm` (Node Package Manager, usually comes with Node.js)

### Installation

1.  **Clone this repository** (or download the `index.mjs` file and `package.json`).
    ```bash
    git clone [https://github.com/Technicusw/WebUntisJSmonitorCatcher.git](https://github.com/Technicusw/WebUntisJSmonitorCatcher.git)
    cd your-repo-name
    ```
    *(Note: If you're not using Git, simply create a project folder, place `index.mjs` and `package.json` inside it.)*

2.  **Install dependencies:**
    ```bash
    npm install
    ```
    This will install `node-fetch`, which is used for making HTTP requests.

3.  **Configure `package.json` for ES Modules:**
    Ensure your `package.json` file in the project root contains `"type": "module"`. If it doesn't, add it:
    ```json
    {
      "name": "webuntis-timetable-fetcher",
      "version": "1.0.0",
      "description": "A Node.js module to fetch WebUntis monitor timetable data.",
      "main": "index.mjs",
      "type": "module",  <-- Make sure this line is present
      "scripts": {
        "start": "node index.mjs"
      },
      "keywords": ["webuntis", "timetable", "substitution", "monitor", "nodejs", "api"],
      "author": "Your Name / Your GitHub Handle",
      "license": "ISC",
      "dependencies": {
        "node-fetch": "^3.3.2"
      }
    }
    ```
    *(Alternatively, you can run the script using `node --input-type=module index.mjs` or rename `index.mjs` to `index.js` and use `node --input-type=module index.js`, but using `type: "module"` in `package.json` is generally cleaner for projects.)*

## Usage

### 1. Interactive Command-Line Interface (CLI)

This is the easiest way to get started and test the functionality.

1.  **Open `index.mjs`** in your code editor.
2.  **Locate the `if (import.meta.main)` block** at the bottom of the file.
3.  **Configure your school's specific details** within the `MY_SCHOOL_CONFIG` object inside this block:
    ```javascript
    // School Format 
    const FormatName = ***  <== // hier Format Name eingeben
    const SchoolName = ***  <== // hier School Name Eingeben
    // ----------------------------------
    ```
    *You'll need to find these values from your school's WebUntis monitor page. Often, looking at the network requests (F12 developer tools in browser) when loading the monitor page can reveal `schoolName`, `formatName`, and `departmentIds` within the request payload. Sometimes the departmentIds are unnecessary.*
4.  **Save** the `index.mjs` file.
5.  **Run the script** from your terminal in the project's root directory:
    ```bash
    npm start
    # or directly: node index.mjs
    ```
6.  Follow the prompts to enter class(es)/course(s) and a date. Leave inputs blank to fetch data for all classes/courses for today.

### 2. Import as a Module in Other Projects

You can integrate the core fetching logic into your own Node.js applications.

1.  **Create a new `.mjs` file** in your project (e.g., `myApp.mjs`).
2.  **Import the `getWebUntisTimetable` function:**
    ```javascript
    // myApp.mjs
    import { getWebUntisTimetable } from './index.mjs'; // Adjust path if index.mjs is elsewhere

    // --- Your School's Configuration ---
    const MY_SCHOOL_CONFIG_FOR_APP = {
        schoolName: "YOUR_SCHOOL_NAME",        // e.g., "Gymnasium am Markt"
        formatName: "YOUR_MONITOR_FORMAT_NAME", // e.g., "GamMa_SuS_2d_Monitor"
        departmentIds: [YOUR_DEPARTMENT_IDS]   // e.g., [2, 1, 3]
    };
    // ----------------------------------

    async function runMyCustomQuery() {
        console.log("Fetching timetable data via module import...");

        // Example: Get today's timetable for classes '11a' and '12'
        const timetableData = await getWebUntisTimetable(
            MY_SCHOOL_CONFIG_FOR_APP,
            {
                dateOffset: 0,
                filterGroups: ['11a', '12']
            }
        );

        if (timetableData) {
            console.log("\n--- Processed Timetable Data (from module) ---");
            // You can now process `timetableData.rows` and `timetableData.absentElements`
            // For example, display all entries for '11a'
            const class11aLessons = timetableData.rows.filter(row => row.group === '11a');
            class11aLessons.forEach(lesson => {
                const [hour, subject, room, teacher, info] = lesson.data;
                console.log(`11a - ${hour} | ${subject} | ${room} | ${teacher} | ${info || ''}`);
            });
        } else {
            console.log("Failed to retrieve timetable data.");
        }
    }

    runMyCustomQuery();
    ```
3.  **Run your application:**
    ```bash
    node myApp.mjs
    ```

## Important Considerations

-   **School-Specific Data:** The `schoolName`, `formatName`, and `departmentIds` are unique to your school's WebUntis setup. This module does **not** include login functionality for personal WebUntis accounts (e.g., for homework, grades, personal messages). It is designed purely for publicly accessible monitor data.
-   **API Stability:** WebUntis API endpoints and structures can change. While this script works based on common monitor API patterns, future changes by WebUntis might require updates to this code.
-   **Rate Limiting:** Be mindful of making too many requests in a short period, as this could lead to IP blocking by the WebUntis server.

## Contributing

Feel free to open issues or submit pull requests if you have improvements or bug fixes.
